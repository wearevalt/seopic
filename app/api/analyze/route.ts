import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { analyzeSchema } from '@/lib/schemas';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase';

const analysisResponseSchema = z.object({
  detectedContent: z.string(),
  suggestedAltText: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  keywords: z.array(z.string()),
  seoScore: z.number().min(0).max(100),
  improvements: z.array(z.string()),
  imageCategory: z.string(),
  tone: z.string(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  
  // 1. Check Rate Limit
  const { success, remaining } = rateLimit(`analyze:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });

  if (!success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans une minute.' },
      { status: 429 }
    );
  }

  // 2. API Key & Model (CORRECTION ICI)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // Utilise le vrai nom du dernier modèle Sonnet
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';

  if (!apiKey) {
    return NextResponse.json({ error: 'Clé API Anthropic manquante dans .env' }, { status: 500 });
  }

  // 3. Parse Body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données manquantes (base64, mimeType...)' }, { status: 400 });
  }

  const { imageBase64, mimeType, imageName, imageSize } = parsed.data;

  // 4. Appel Anthropic
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType, // ex: image/jpeg
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: "Analyse cette image pour le SEO. Tu dois répondre EXCLUSIVEMENT avec un objet JSON structuré comme ceci, sans aucun texte avant ou après : { \"detectedContent\": \"...\", \"suggestedAltText\": \"...\", \"metaTitle\": \"...\", \"metaDescription\": \"...\", \"keywords\": [\"...\"], \"seoScore\": 85, \"improvements\": [\"...\"], \"imageCategory\": \"...\", \"tone\": \"...\" }",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic Error:', errorData);
      return NextResponse.json({ error: `Erreur Claude: ${errorData.error?.message || 'Inconnue'}` }, { status: response.status });
    }

    const data = await response.json();
    const rawText = data.content[0].text;

    // 5. Extraction Robuste du JSON (au cas où Claude ajoute du texte)
    let jsonContent = rawText;
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonContent = rawText.substring(jsonStart, jsonEnd + 1);
    }

    let rawAnalysis;
    try {
      rawAnalysis = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse JSON:', rawText);
      return NextResponse.json({ error: 'L\'IA a renvoyé un format invalide' }, { status: 502 });
    }

    const validated = analysisResponseSchema.safeParse(rawAnalysis);
    if (!validated.success) {
      return NextResponse.json({ error: 'Champs JSON manquants' }, { status: 502 });
    }

    const analysis = validated.data;

    // 6. Sauvegarde Supabase (Asynchrone pour ne pas bloquer la réponse)
    try {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET });
      const userEmail = token?.email;

      if (userEmail) {
        const supabaseAdmin = getSupabaseAdmin();
        await supabaseAdmin.from('analyses').insert({
          user_email: userEmail,
          image_name: imageName ?? null,
          image_size: imageSize ?? null,
          seo_score: analysis.seoScore,
          alt_text: analysis.suggestedAltText,
          meta_title: analysis.metaTitle,
          meta_description: analysis.metaDescription,
          keywords: analysis.keywords,
          image_category: analysis.imageCategory,
          detected_content: analysis.detectedContent,
          tone: analysis.tone,
        });
      }
    } catch (err) {
      console.error('Supabase Save Error:', err);
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Global Route Error:', error);
    return NextResponse.json({ error: 'Erreur interne lors de l\'analyse' }, { status: 500 });
  }
}
