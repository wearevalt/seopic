import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const replySchema = z.object({
  message: z.string().min(1, 'Message requis').max(5000, 'Message trop long'),
  author: z.string().max(100).optional(),
});

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  const supabaseAdmin = getSupabaseAdmin();

  const ip = getClientIp(req);
  const { success } = rateLimit(`ticket-reply:${ip}`, {
    limit: 10,
    windowMs: 5 * 60_000,
  });

  if (!success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans 5 minutes.' },
      { status: 429, headers: { 'Retry-After': '300' } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Requête invalide' },
      { status: 400 }
    );
  }

  const { message, author } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('replies')
    .insert({
      ticket_id: params.id,
      message,
      author: author ?? 'Support',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
