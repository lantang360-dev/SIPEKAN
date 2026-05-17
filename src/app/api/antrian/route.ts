import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/antrian
 * Get current queue status, stats, and active queues
 * 
 * Query params:
 *   - date: YYYY-MM-DD (default: today)
 *   - service: service type filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const service = searchParams.get('service')

    // Determine target date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const targetDate = dateStr ? new Date(dateStr) : today
    targetDate.setHours(0, 0, 0, 0)

    const targetTomorrow = new Date(targetDate)
    targetTomorrow.setDate(targetTomorrow.getDate() + 1)

    // Build where clause
    const where: any = {
      tanggal: {
        gte: targetDate,
        lt: targetTomorrow,
      },
    }
    if (service) {
      where.serviceType = service
    }

    // Get queue entries for today
    const queueEntries = await db.queueEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        counter: {
          select: { id: true, name: true },
        },
      },
    })

    // Get daily stats
    const dailyQueues = await db.dailyQueue.findMany({
      where: {
        tanggal: {
          gte: targetDate,
          lt: targetTomorrow,
        },
      },
    })

    // Get active counters
    const counters = await db.counter.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })

    // Calculate stats
    const stats = {
      menunggu: queueEntries.filter(q => q.status === 'menunggu').length,
      dipanggil: queueEntries.filter(q => q.status === 'dipanggil').length,
      dilayani: queueEntries.filter(q => q.status === 'dilayani').length,
      selesai: queueEntries.filter(q => q.status === 'selesai').length,
      total: queueEntries.length,
    }

    // Get last called numbers per service
    const lastCalled: Record<string, any> = {}
    for (const entry of queueEntries) {
      if (entry.status === 'dipanggil' || entry.status === 'dilayani') {
        if (!lastCalled[entry.serviceType] || entry.calledAt! > lastCalled[entry.serviceType].calledAt) {
          lastCalled[entry.serviceType] = entry
        }
      }
    }

    // Build service summaries
    const services = ['besukan_tatap_muka', 'penitipan_barang']
    const serviceSummaries = services.map(svc => {
      const dq = dailyQueues.find(d => d.serviceType === svc)
      const svcQueues = queueEntries.filter(q => q.serviceType === svc)
      const last = lastCalled[svc]
      return {
        serviceType: svc,
        label: svc === 'besukan_tatap_muka' ? 'Besukan Tatap Muka' : 'Penitipan Barang',
        prefix: svc === 'besukan_tatap_muka' ? 'B' : 'P',
        lastIssued: dq?.lastNumber || 0,
        currentlyServing: last?.nomorAntrian || null,
        counterName: last?.counter?.name || null,
        totalWaiting: svcQueues.filter(q => q.status === 'menunggu').length,
        totalCalled: dq?.totalCalled || 0,
        totalServed: dq?.totalServed || 0,
      }
    })

    return NextResponse.json({
      date: targetDate.toISOString().split('T')[0],
      stats,
      services: serviceSummaries,
      queues: queueEntries,
      counters,
    })
  } catch (error: any) {
    console.error('[GET /api/antrian] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data antrian', detail: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/antrian
 * Create a new queue entry (ambil nomor antrian)
 * 
 * Body:
 *   - serviceType: "besukan_tatap_muka" | "penitipan_barang"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serviceType } = body

    if (!serviceType || !['besukan_tatap_muka', 'penitipan_barang'].includes(serviceType)) {
      return NextResponse.json(
        { error: 'serviceType tidak valid. Gunakan: besukan_tatap_muka atau penitipan_barang' },
        { status: 400 }
      )
    }

    const prefix = serviceType === 'besukan_tatap_muka' ? 'B' : 'P'
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get or create daily queue tracker
    let dailyQueue = await db.dailyQueue.findUnique({
      where: {
        tanggal_serviceType: {
          tanggal: today,
          serviceType,
        },
      },
    })

    if (!dailyQueue) {
      dailyQueue = await db.dailyQueue.create({
        data: {
          tanggal: today,
          serviceType,
          lastNumber: 0,
          prefix,
        },
      })
    }

    // Increment and create queue entry
    const nextNumber = dailyQueue.lastNumber + 1
    const nomorAntrian = `${prefix}-${String(nextNumber).padStart(4, '0')}`

    // Update daily tracker
    await db.dailyQueue.update({
      where: { id: dailyQueue.id },
      data: { lastNumber: nextNumber },
    })

    // Create queue entry
    const queueEntry = await db.queueEntry.create({
      data: {
        nomorAntrian,
        serviceType,
        status: 'menunggu',
        tanggal: today,
      },
    })

    // Get updated stats
    const waitingCount = await db.queueEntry.count({
      where: {
        serviceType,
        status: 'menunggu',
        tanggal: { gte: today },
      },
    })

    const totalToday = await db.dailyQueue.findUnique({
      where: { id: dailyQueue.id },
    })

    return NextResponse.json({
      queueEntry,
      nomorAntrian,
      serviceType,
      serviceLabel: serviceType === 'besukan_tatap_muka' ? 'Besukan Tatap Muka' : 'Penitipan Barang',
      estimasi: {
        antrianSebelum: waitingCount - 1,
        estimasiWaktu: `${Math.ceil((waitingCount - 1) * 3)} menit`,
      },
      totalHariIni: totalToday?.lastNumber || 0,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/antrian] Error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat nomor antrian', detail: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/antrian
 * Update queue entry status
 * 
 * Body:
 *   - id: queue entry ID
 *   - status: new status
 *   - counterId: counter ID (for dipanggil/dilayani)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, counterId } = body

    if (!id) {
      return NextResponse.json({ error: 'ID antrian diperlukan' }, { status: 400 })
    }

    const validStatuses = ['menunggu', 'dipanggil', 'dilayani', 'selesai', 'dilewati']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status tidak valid: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await db.queueEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Antrian tidak ditemukan' }, { status: 404 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (counterId) updateData.counterId = counterId

    if (status === 'dipanggil') {
      updateData.calledAt = new Date()
    } else if (status === 'dilayani') {
      updateData.servedAt = new Date()
    } else if (status === 'selesai') {
      updateData.completedAt = new Date()
    }

    const updated = await db.queueEntry.update({
      where: { id },
      data: updateData,
      include: { counter: { select: { id: true, name: true } } },
    })

    // Update daily tracker if called or completed
    if (status === 'dipanggil' || status === 'selesai') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const dailyQueue = await db.dailyQueue.findUnique({
        where: {
          tanggal_serviceType: {
            tanggal: today,
            serviceType: existing.serviceType,
          },
        },
      })

      if (dailyQueue) {
        await db.dailyQueue.update({
          where: { id: dailyQueue.id },
          data: {
            totalCalled: status === 'dipanggil'
              ? { increment: 1 }
              : dailyQueue.totalCalled,
            totalServed: status === 'selesai'
              ? { increment: 1 }
              : dailyQueue.totalServed,
          },
        })
      }
    }

    // Update counter lastCalledAt
    if (status === 'dipanggil' && counterId) {
      await db.counter.update({
        where: { id: counterId },
        data: { lastCalledAt: new Date() },
      })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('[PUT /api/antrian] Error:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui antrian', detail: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/antrian
 * Reset daily queue (admin only)
 * 
 * Query params:
 *   - service: optional, reset specific service only
 *   - confirm: must be "RESET" to confirm
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')
    const confirm = searchParams.get('confirm')

    if (confirm !== 'RESET') {
      return NextResponse.json(
        { error: 'Konfirmasi diperlukan. Tambahkan ?confirm=RESET' },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const where: any = {
      tanggal: {
        gte: today,
        lt: tomorrow,
      },
    }
    if (service) {
      where.serviceType = service
    }

    // Delete queue entries
    const deleted = await db.queueEntry.deleteMany({ where })

    // Reset daily trackers
    const dailyWhere: any = {
      tanggal: {
        gte: today,
        lt: tomorrow,
      },
    }
    if (service) {
      dailyWhere.serviceType = service
    }

    const resetDaily = await db.dailyQueue.updateMany({
      where: dailyWhere,
      data: {
        lastNumber: 0,
        totalCalled: 0,
        totalServed: 0,
      },
    })

    return NextResponse.json({
      message: 'Antrian berhasil direset',
      deletedEntries: deleted.count,
      resetTrackers: resetDaily.count,
    })
  } catch (error: any) {
    console.error('[DELETE /api/antrian] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mereset antrian', detail: error.message },
      { status: 500 }
    )
  }
}
