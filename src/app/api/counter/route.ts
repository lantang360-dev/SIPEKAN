import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const todayStart = getStartOfDay()
    const todayEnd = getEndOfDay()

    const counters = await db.counter.findMany({
      where: { isActive: true },
      include: {
        layanan: {
          select: {
            id: true,
            kode: true,
            nama: true,
            prefix: true,
          },
        },
        dailySessions: {
          where: {
            tanggal: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        },
      },
      orderBy: { nomor: 'asc' },
    })

    const countersWithSession = counters.map((counter) => {
      const session = counter.dailySessions[0] || null
      const { dailySessions, ...counterData } = counter

      return {
        ...counterData,
        todaySession: session
          ? {
              id: session.id,
              currentNumber: session.currentNumber,
              totalCalled: session.totalCalled,
              totalMenunggu: session.totalMenunggu,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      data: countersWithSession,
    })
  } catch (error) {
    console.error('GET counter error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
