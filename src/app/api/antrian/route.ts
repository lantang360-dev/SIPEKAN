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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { layananId } = body

    if (!layananId) {
      return NextResponse.json(
        { success: false, message: 'layananId wajib diisi' },
        { status: 400 }
      )
    }

    const layanan = await db.layanan.findUnique({
      where: { id: layananId, isActive: true },
    })

    if (!layanan) {
      return NextResponse.json(
        { success: false, message: 'Layanan tidak ditemukan atau tidak aktif' },
        { status: 404 }
      )
    }

    const todayStart = getStartOfDay()
    const todayEnd = getEndOfDay()

    const todayTicketCount = await db.queueTicket.count({
      where: {
        layananId,
        tanggal: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    const nextNumber = todayTicketCount + 1
    const nomorAntrian = `${layanan.prefix}-${String(nextNumber).padStart(4, '0')}`

    const ticket = await db.queueTicket.create({
      data: {
        nomorAntrian,
        layananId,
        tanggal: new Date(),
        status: 'menunggu',
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
      },
    })

    const position = await db.queueTicket.count({
      where: {
        layananId,
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

    return NextResponse.json(
      {
        success: true,
        message: 'Nomor antrian berhasil diambil',
        data: {
          ...ticket,
          posisiAntrian: position,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST antrian error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
