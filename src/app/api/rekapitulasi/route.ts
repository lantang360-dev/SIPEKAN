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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const dayStart = getStartOfDay(targetDate)
    const dayEnd = getEndOfDay(targetDate)

    const registrationStats = await db.registration.groupBy({
      by: ['status'],
      where: {
        tanggalBesukan: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      _count: {
        status: true,
      },
    })

    const registrationByStatus: Record<string, number> = {}
    for (const stat of registrationStats) {
      registrationByStatus[stat.status] = stat._count.status
    }
    registrationByStatus.total = Object.values(registrationByStatus).reduce(
      (sum, val) => (typeof val === 'number' ? sum + val : sum),
      0
    )

    const ticketStats = await db.queueTicket.groupBy({
      by: ['status'],
      where: {
        tanggal: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      _count: {
        status: true,
      },
    })

    const ticketByStatus: Record<string, number> = {}
    for (const stat of ticketStats) {
      ticketByStatus[stat.status] = stat._count.status
    }
    ticketByStatus.total = Object.values(ticketByStatus).reduce(
      (sum, val) => (typeof val === 'number' ? sum + val : sum),
      0
    )

    const ticketByLayanan = await db.queueTicket.groupBy({
      by: ['layananId'],
      where: {
        tanggal: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      _count: {
        id: true,
      },
    })

    const layananIds = ticketByLayanan.map((t) => t.layananId)
    const layananData = layananIds.length > 0
      ? await db.layanan.findMany({
          where: { id: { in: layananIds } },
          select: { id: true, kode: true, nama: true, prefix: true },
        })
      : []

    const layananMap = new Map(layananData.map((l) => [l.id, l]))

    const layananBreakdown = ticketByLayanan.map((t) => ({
      layanan: layananMap.get(t.layananId) || { id: t.layananId, kode: 'unknown', nama: 'Unknown', prefix: '?' },
      total: t._count.id,
    }))

    const allCallsToday = await db.queueCall.findMany({
      where: {
        waktu: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      select: {
        waktu: true,
        counterId: true,
      },
    })

    const hourlyBreakdown: { hour: number; count: number }[] = []
    for (let h = 7; h <= 16; h++) {
      const count = allCallsToday.filter((call) => {
        const callHour = call.waktu.getHours()
        return callHour === h
      }).length

      hourlyBreakdown.push({
        hour: h,
        count,
      })
    }

    const counterStats = await db.counter.findMany({
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
              gte: dayStart,
              lte: dayEnd,
            },
          },
        },
        _count: {
          select: {
            calls: {
              where: {
                waktu: {
                  gte: dayStart,
                  lte: dayEnd,
                },
              },
            },
          },
        },
      },
      orderBy: { nomor: 'asc' },
    })

    const perCounterStats = counterStats.map((c) => ({
      counter: {
        id: c.id,
        nomor: c.nomor,
        nama: c.nama,
        layanan: c.layanan,
      },
      session: c.dailySessions[0]
        ? {
            currentNumber: c.dailySessions[0].currentNumber,
            totalCalled: c.dailySessions[0].totalCalled,
            totalMenunggu: c.dailySessions[0].totalMenunggu,
          }
        : null,
      totalCalls: c._count.calls,
    }))

    return NextResponse.json({
      success: true,
      data: {
        date: dayStart.toISOString().split('T')[0],
        registrations: registrationByStatus,
        tickets: ticketByStatus,
        layananBreakdown,
        hourlyBreakdown,
        perCounterStats,
      },
    })
  } catch (error) {
    console.error('GET rekapitulasi error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
