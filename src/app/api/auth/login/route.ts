import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionCookie } from '@/lib/session'
import bcrypt from 'bcryptjs'

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

    let isPasswordValid = false

    // Check if stored password is a bcrypt hash (starts with $2b$ or $2a$)
    if (petugas.password.startsWith('$2b$') || petugas.password.startsWith('$2a$')) {
      // Use bcrypt comparison for hashed passwords
      isPasswordValid = await bcrypt.compare(password, petugas.password)
    } else {
      // Fallback: plain text comparison (for legacy data)
      isPasswordValid = password === petugas.password
    }

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
  } catch (error: any) {
    console.error('Login error:', error?.message || error)
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan server',
        detail: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}
