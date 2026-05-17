import { NextRequest, NextResponse } from 'next/server'
import { getPetugasFromRequest } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const petugas = await getPetugasFromRequest(request)

    if (!petugas) {
      return NextResponse.json(
        { success: false, message: 'Sesi tidak valid atau sudah expired' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: petugas,
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
