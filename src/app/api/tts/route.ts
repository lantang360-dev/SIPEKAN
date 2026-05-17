import { NextRequest, NextResponse } from 'next/server'

// In-memory cache for TTS audio to avoid repeated API calls
const ttsCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 50

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get('text')
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 })
  }

  // Check cache first
  const cacheKey = text.trim().toLowerCase()
  const cached = ttsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.buffer, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=300',
        'Content-Length': String(cached.buffer.length),
      },
    })
  }

  try {
    // Use Google Translate TTS (free, no API key needed, supports Indonesian)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodeURIComponent(text.trim())}`

    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })

    if (!response.ok) {
      console.error('TTS API error:', response.status, response.statusText)
      return NextResponse.json({ error: 'TTS service unavailable' }, { status: 502 })
    }

    const contentType = response.headers.get('Content-Type') || 'audio/mpeg'
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Cache the result
    if (ttsCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = [...ttsCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0]
      if (oldestKey) ttsCache.delete(oldestKey)
    }
    ttsCache.set(cacheKey, { buffer, contentType, timestamp: Date.now() })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('TTS fetch error:', error)
    return NextResponse.json({ error: 'TTS fetch failed' }, { status: 500 })
  }
}
