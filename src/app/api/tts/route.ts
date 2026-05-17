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

    return NextResponse.json(
      { error: 'Fitur TTS belum tersedia di mode production' },
      { status: 501 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal menghasilkan suara' },
      { status: 500 }
    )
  }
}