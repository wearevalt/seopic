import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

function sanitizeFilename(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'image-seo'
  )
}

function buildXmpMetadata({
  title,
  altText,
  description,
  keywords,
}: {
  title: string
  altText: string
  description: string
  keywords: string[]
}) {
  const safeTitle = title || ''
  const safeAlt = altText || ''
  const safeDescription = description || ''
  const safeKeywords = (keywords || []).join(', ')

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description
      rdf:about=""
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${safeTitle}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${safeDescription}</rdf:li>
        </rdf:Alt>
      </dc:description>
      <dc:subject>
        <rdf:Bag>
          ${(keywords || [])
            .map((k) => `<rdf:li>${k}</rdf:li>`)
            .join('')}
        </rdf:Bag>
      </dc:subject>
      <photoshop:Headline>${safeTitle}</photoshop:Headline>
      <photoshop:CaptionWriter>SeoPic</photoshop:CaptionWriter>
      <photoshop:Instructions>${safeAlt}</photoshop:Instructions>
      <xmp:Label>${safeKeywords}</xmp:Label>
      <xmp:Nickname>${safeAlt}</xmp:Nickname>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      imageBase64,
      filename,
      title,
      altText,
      description,
      keywords,
      format,
      quality,
    }: {
      imageBase64?: string
      filename?: string
      title?: string
      altText?: string
      description?: string
      keywords?: string[]
      format?: 'jpg' | 'png' | 'webp'
      quality?: number
    } = body

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image manquante' }, { status: 400 })
    }

    const outputFormat = format || 'jpg'
    const outputQuality =
      typeof quality === 'number' && quality >= 40 && quality <= 100 ? quality : 85

    const inputBuffer = Buffer.from(imageBase64, 'base64')
    const safeFilename = sanitizeFilename(filename || title || 'image-seo')

    const xmp = buildXmpMetadata({
      title: title || '',
      altText: altText || '',
      description: description || '',
      keywords: Array.isArray(keywords) ? keywords : [],
    })

    let transformer = sharp(inputBuffer).withMetadata({
      xmp: Buffer.from(xmp, 'utf8'),
    })

    let outputBuffer: Buffer
    let contentType: string
    let extension: string

    if (outputFormat === 'png') {
      outputBuffer = await transformer.png().toBuffer()
      contentType = 'image/png'
      extension = 'png'
    } else if (outputFormat === 'webp') {
      outputBuffer = await transformer.webp({ quality: outputQuality }).toBuffer()
      contentType = 'image/webp'
      extension = 'webp'
    } else {
      outputBuffer = await transformer.jpeg({ quality: outputQuality }).toBuffer()
      contentType = 'image/jpeg'
      extension = 'jpg'
    }

    const finalFilename = `${safeFilename}.${extension}`

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
      },
    })
  } catch (error) {
    console.error('POST /api/inject-image error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
