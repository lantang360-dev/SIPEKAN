import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const text = searchParams.get('text')

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Parameter text wajib diisi' },
        { status: 400 }
      )
    }

    // Trim and limit text length (max 1024 chars)
    const trimmedText = text.trim().slice(0, 1024)

    // Import SDK dynamically (server-side only)
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const response = await zai.audio.tts.create({
      input: trimmedText,
      voice: 'tongtong',
      speed: 0.9,
      response_format: 'wav',
      stream: false,
    })

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('TTS API Error:', error)
    return NextResponse.json(
      { error: 'Gagal menghasilkan suara' },
      { status: 500 }
    )
  }
}
