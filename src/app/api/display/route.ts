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

    // All counters with today's current numbers
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

    const countersData = counters.map((c) => {
      const session = c.dailySessions[0]
      return {
        id: c.id,
        nomor: c.nomor,
        nama: c.nama,
        layanan: c.layanan,
        currentNumber: session
          ? `${c.layanan.prefix}-${String(session.currentNumber).padStart(4, '0')}`
          : `${c.layanan.prefix}-0001`,
        totalCalled: session?.totalCalled || 0,
      }
    })

    // Last 20 queue calls across all counters
    const recentCalls = await db.queueCall.findMany({
      where: {
        waktu: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { waktu: 'desc' },
      take: 20,
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
          },
        },
      },
    })

    // Today's ticket stats
    const [totalMenunggu, totalDipanggil, totalSelesai] = await Promise.all([
      db.queueTicket.count({
        where: {
          tanggal: { gte: todayStart, lte: todayEnd },
          status: 'menunggu',
        },
      }),
      db.queueTicket.count({
        where: {
          tanggal: { gte: todayStart, lte: todayEnd },
          status: 'dipanggil',
        },
      }),
      db.queueTicket.count({
        where: {
          tanggal: { gte: todayStart, lte: todayEnd },
          status: 'selesai',
        },
      }),
    ])

    // Last call info (most recent across all counters)
    const lastCall = recentCalls.length > 0 ? recentCalls[0] : null

    return NextResponse.json({
      success: true,
      data: {
        counters: countersData,
        recentCalls,
        stats: {
          totalMenunggu,
          totalDipanggil,
          totalSelesai,
          totalServed: totalDipanggil + totalSelesai,
        },
        lastCall,
      },
    })
  } catch (error) {
    console.error('GET display error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
