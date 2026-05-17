import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionCookie } from '@/lib/session'

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

    // Compare password (support both bcrypt hash and plain text)
    let isPasswordValid = false
    if (petugas.password.startsWith('$2')) {
      // bcrypt hash - need to verify
      const bcrypt = require('bcryptjs')
      isPasswordValid = await bcrypt.compare(password, petugas.password)
    } else {
      // plain text
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
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Error: ' + (error.message || String(error)) },
      { status: 500 }
    )
  }
}
