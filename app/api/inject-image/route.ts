import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      imageBase64,
      filename,
      title,
      description,
      keywords,
      format,
      quality,
    } = body

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image manquante' }, { status: 400 })
    }

    // Convert base64 → buffer
    const buffer = Buffer.from(imageBase64, 'base64')

    let image = sharp(buffer)

    // 🔥 METADATA SEO
    const metaString = `
Title: ${title}
Description: ${description}
Keywords: ${(keywords || []).join(', ')}
    `.trim()

    image = image.withMetadata({
      exif: {
        IFD0: {
          ImageDescription: metaString,
        },
      },
    })

    // 🎯 FORMAT & COMPRESSION
    let outputBuffer: Buffer
    let contentType = 'image/jpeg'
    let extension = 'jpg'

    if (format === 'png') {
      outputBuffer = await image.png().toBuffer()
      contentType = 'image/png'
      extension = 'png'
    } else if (format === 'webp') {
      outputBuffer = await image.webp({ quality: quality || 80 }).toBuffer()
      contentType = 'image/webp'
      extension = 'webp'
    } else {
      outputBuffer = await image.jpeg({ quality: quality || 90 }).toBuffer()
      contentType = 'image/jpeg'
      extension = 'jpg'
    }

    // 📁 FILENAME SEO
    const safeFilename = (filename || 'image-seo')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')

    const finalName = `${safeFilename}.${extension}`

    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${finalName}"`,
      },
    })
  } catch (error) {
    console.error('Inject image error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
