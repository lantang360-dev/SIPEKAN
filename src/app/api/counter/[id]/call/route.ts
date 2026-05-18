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
    const body = await request.json()
    const { petugasId } = body

    if (!petugasId) {
      return NextResponse.json(
        { success: false, message: 'petugasId wajib diisi' },
        { status: 400 }
      )
    }

    const counter = await db.counter.findUnique({
      where: { id: counterId },
      include: {
        layanan: {
          select: {
            id: true,
            kode: true,
            nama: true,
            prefix: true,
          },
        },
      },
    })

    if (!counter || !counter.isActive) {
      return NextResponse.json(
        { success: false, message: 'Counter tidak ditemukan atau tidak aktif' },
        { status: 404 }
      )
    }

    const petugas = await db.petugas.findUnique({
      where: { id: petugasId },
    })

    if (!petugas) {
      return NextResponse.json(
        { success: false, message: 'Petugas tidak ditemukan' },
        { status: 400 }
      )
    }

    const todayStart = getStartOfDay()
    const todayEnd = getEndOfDay()
    const previousNumber = counter.layanan.prefix + '-0000'

    const result = await db.$transaction(async (tx) => {
      let session = await tx.dailySession.findUnique({
        where: {
          tanggal_counterId: {
            tanggal: todayStart,
            counterId,
          },
        },
      })

      if (!session) {
        session = await tx.dailySession.create({
          data: {
            tanggal: todayStart,
            counterId,
            currentNumber: 1,
          },
        })
      }

      const previousNumberFormatted =
        session.currentNumber > 0
          ? `${counter.layanan.prefix}-${String(session.currentNumber).padStart(4, '0')}`
          : previousNumber

      const newNumber = session.currentNumber + 1
      const nomorAntrian = `${counter.layanan.prefix}-${String(newNumber).padStart(4, '0')}`

      await tx.dailySession.update({
        where: { id: session.id },
        data: {
          currentNumber: newNumber,
          totalCalled: { increment: 1 },
        },
      })

      const queueCall = await tx.queueCall.create({
        data: {
          nomorAntrian,
          counterId,
          petugasId,
        },
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
      })

      const waitingTicket = await tx.queueTicket.findFirst({
        where: {
          layananId: counter.layananId,
          nomorAntrian,
          status: 'menunggu',
          tanggal: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      })

      if (waitingTicket) {
        await tx.queueTicket.update({
          where: { id: waitingTicket.id },
          data: {
            status: 'dipanggil',
            callId: queueCall.id,
            dipanggilPada: new Date(),
            dipanggilDi: counter.nama,
          },
        })
      }

      return {
        nomorAntrian,
        queueCall,
        previousNumber: previousNumberFormatted,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Antrian berhasil dipanggil',
      data: result,
    })
  } catch (error) {
    console.error('POST counter call error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
