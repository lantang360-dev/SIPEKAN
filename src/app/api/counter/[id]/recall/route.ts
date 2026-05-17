import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: counterId } = await params

    const todayStart = getStartOfDay()
    const todayEnd = getEndOfDay()

    const lastCall = await db.queueCall.findFirst({
      where: {
        counterId,
        waktu: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { waktu: 'desc' },
      include: {
        counter: {
          select: {
            id: true,
            nomor: true,
            nama: true,
          },
        },
        petugas: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
          },
        },
        ticket: {
          select: {
            id: true,
            nomorAntrian: true,
            status: true,
          },
        },
      },
    })

    if (!lastCall) {
      return NextResponse.json(
        { success: false, message: 'Belum ada panggilan hari ini untuk counter ini' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: lastCall,
    })
  } catch (error) {
    console.error('POST counter recall error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
