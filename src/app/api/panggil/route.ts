import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/panggil
 * Call the next queue number for a specific counter
 * 
 * Body:
 *   - counterId: counter/loket ID
 *   - serviceType: optional, "besukan_tatap_muka" or "penitipan_barang"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { counterId, serviceType } = body

    if (!counterId) {
      return NextResponse.json({ error: 'counterId diperlukan' }, { status: 400 })
    }

    // Verify counter exists and is active
    const counter = await db.counter.findUnique({ where: { id: counterId } })
    if (!counter) {
      return NextResponse.json({ error: 'Loket tidak ditemukan' }, { status: 404 })
    }
    if (!counter.isActive) {
      return NextResponse.json({ error: 'Loket tidak aktif' }, { status: 400 })
    }

    // Mark counter as online
    await db.counter.update({
      where: { id: counterId },
      data: { isOnline: true, lastCalledAt: new Date() },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Mark previous call as completed (skip/lewat)
    const previousCall = await db.queueEntry.findFirst({
      where: {
        counterId,
        status: 'dipanggil',
        tanggal: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    if (previousCall) {
      await db.queueEntry.update({
        where: { id: previousCall.id },
        data: { status: 'dilewati', completedAt: new Date() },
      })
    }

    // Find next waiting queue entry
    const where: any = {
      status: 'menunggu',
      tanggal: {
        gte: today,
        lt: tomorrow,
      },
    }

    if (serviceType) {
      where.serviceType = serviceType
    }

    // If counter is assigned to a specific service, use that
    if (counter.serviceType && !serviceType) {
      where.serviceType = counter.serviceType
    }

    const nextEntry = await db.queueEntry.findFirst({
      where,
      orderBy: { createdAt: 'asc' },
    })

    if (!nextEntry) {
      return NextResponse.json({
        message: 'Tidak ada antrian menunggu',
        counter,
        called: false,
      })
    }

    // Update the queue entry to dipanggil
    const updated = await db.queueEntry.update({
      where: { id: nextEntry.id },
      data: {
        status: 'dipanggil',
        counterId,
        calledAt: new Date(),
      },
      include: { counter: { select: { id: true, name: true } } },
    })

    // Update daily tracker
    const dailyQueue = await db.dailyQueue.findUnique({
      where: {
        tanggal_serviceType: {
          tanggal: today,
          serviceType: updated.serviceType,
        },
      },
    })

    if (dailyQueue) {
      await db.dailyQueue.update({
        where: { id: dailyQueue.id },
        data: { totalCalled: { increment: 1 } },
      })
    }

    return NextResponse.json({
      message: `Nomor ${updated.nomorAntrian} dipanggil ke ${counter.name}`,
      queue: updated,
      counter,
      called: true,
    })
  } catch (error: any) {
    console.error('[POST /api/panggil] Error:', error)
    return NextResponse.json(
      { error: 'Gagal memanggil antrian', detail: error.message },
      { status: 500 }
    )
  }
}
