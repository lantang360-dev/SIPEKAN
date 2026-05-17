import { NextResponse } from 'next/server'
import { createLogoutCookie } from '@/lib/session'

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout berhasil',
    })

    response.headers.set('Set-Cookie', createLogoutCookie())
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
