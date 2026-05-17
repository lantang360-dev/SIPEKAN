import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const registration = await db.registration.findUnique({
      where: { id },
      include: {
        layanan: {
          select: {
            id: true,
            kode: true,
            nama: true,
            prefix: true,
            estimasi: true,
          },
        },
        verifiedByPetugas: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
          },
        },
        verifications: {
          orderBy: { createdAt: 'desc' },
          include: {
            petugas: {
              select: {
                id: true,
                nama: true,
                jabatan: true,
              },
            },
          },
        },
      },
    })

    if (!registration) {
      return NextResponse.json(
        { success: false, message: 'Pendaftaran tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: registration,
    })
  } catch (error) {
    console.error('GET pendaftaran by id error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
