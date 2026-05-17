import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/counter
 * Get all counters with current serving info
 * 
 * Query params:
 *   - active: "true" for active only
 *   - service: filter by serviceType
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const service = searchParams.get('service')

    const where: any = {}
    if (activeOnly) where.isActive = true
    if (service) where.serviceType = service

    const counters = await db.counter.findMany({
      where,
      orderBy: { order: 'asc' },
    })

    // Enrich with current serving info
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const enriched = await Promise.all(counters.map(async (counter) => {
      const currentlyServing = await db.queueEntry.findFirst({
        where: {
          counterId: counter.id,
          status: { in: ['dipanggil', 'dilayani'] },
          tanggal: {
            gte: today,
            lt: tomorrow,
          },
        },
        orderBy: { calledAt: 'desc' },
      })

      const lastServed = await db.queueEntry.findFirst({
        where: {
          counterId: counter.id,
          status: 'selesai',
          tanggal: {
            gte: today,
            lt: tomorrow,
          },
        },
        orderBy: { completedAt: 'desc' },
      })

      const servedToday = await db.queueEntry.count({
        where: {
          counterId: counter.id,
          status: 'selesai',
          tanggal: {
            gte: today,
            lt: tomorrow,
          },
        },
      })

      return {
        ...counter,
        currentServing: currentlyServing?.nomorAntrian || null,
        currentService: currentlyServing?.serviceType || null,
        lastServed: lastServed?.nomorAntrian || null,
        servedToday,
      }
    }))

    return NextResponse.json(enriched)
  } catch (error: any) {
    console.error('[GET /api/counter] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data loket', detail: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/counter
 * Create a new counter/loket
 * 
 * Body:
 *   - name: counter name
 *   - serviceType: optional service type
 *   - order: display order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, serviceType, order } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nama loket diperlukan' }, { status: 400 })
    }

    const counter = await db.counter.create({
      data: {
        name: name.trim(),
        serviceType: serviceType || null,
        order: order || 0,
      },
    })

    return NextResponse.json(counter, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/counter] Error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat loket', detail: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/counter
 * Update a counter
 * 
 * Body:
 *   - id: counter ID
 *   - name, serviceType, isActive, isOnline, order
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID loket diperlukan' }, { status: 400 })
    }

    const existing = await db.counter.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Loket tidak ditemukan' }, { status: 404 })
    }

    const data: any = {}
    if (updateData.name !== undefined) data.name = updateData.name
    if (updateData.serviceType !== undefined) data.serviceType = updateData.serviceType
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive
    if (updateData.isOnline !== undefined) data.isOnline = updateData.isOnline
    if (updateData.order !== undefined) data.order = updateData.order

    const updated = await db.counter.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('[PUT /api/counter] Error:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui loket', detail: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/counter
 * Delete a counter
 * 
 * Query params:
 *   - id: counter ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID loket diperlukan' }, { status: 400 })
    }

    const existing = await db.counter.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Loket tidak ditemukan' }, { status: 404 })
    }

    // Check if counter has active queues
    const activeQueues = await db.queueEntry.count({
      where: {
        counterId: id,
        status: { in: ['dipanggil', 'dilayani'] },
      },
    })

    if (activeQueues > 0) {
      return NextResponse.json(
        { error: `Loket memiliki ${activeQueues} antrian aktif. Selesaikan terlebih dahulu.` },
        { status: 400 }
      )
    }

    await db.counter.delete({ where: { id } })

    return NextResponse.json({ message: 'Loket berhasil dihapus' })
  } catch (error: any) {
    console.error('[DELETE /api/counter] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus loket', detail: error.message },
      { status: 500 }
    )
  }
}
