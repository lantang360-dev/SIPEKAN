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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nomor: string }> }
) {
  try {
    const { nomor } = await params
    const todayStart = getStartOfDay()
    const todayEnd = getEndOfDay()

    const ticket = await db.queueTicket.findFirst({
      where: {
        nomorAntrian: nomor,
        tanggal: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
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
        calledBy: {
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
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: 'Tiket antrian tidak ditemukan' },
        { status: 404 }
      )
    }

    // Calculate position in queue (only if status is menunggu)
    let posisiAntrian = 0
    if (ticket.status === 'menunggu') {
      posisiAntrian = await db.queueTicket.count({
        where: {
          layananId: ticket.layananId,
          status: 'menunggu',
          tanggal: {
            gte: todayStart,
            lte: todayEnd,
          },
          createdAt: {
            lte: ticket.createdAt,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        posisiAntrian,
      },
    })
  } catch (error) {
    console.error('GET antrian by nomor error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
