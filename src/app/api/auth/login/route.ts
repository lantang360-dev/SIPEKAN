import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionCookie } from '@/lib/session'
import { verifyPassword } from '@/lib/password'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi' },
        { status: 400 }
      )
    }

    const petugas = await db.petugas.findUnique({
      where: { username },
    })

    if (!petugas) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
        { status: 401 }
      )
    }

    // Verify password (supports both hashed and plain-text)
    const isPasswordValid = await verifyPassword(password, petugas.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
        { status: 401 }
      )
    }

    const { password: _, ...petugasData } = petugas

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil',
      data: petugasData,
    })

    response.headers.set('Set-Cookie', createSessionCookie(petugas.id))
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
