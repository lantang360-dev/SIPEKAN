import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/antrian/[id]
 * Get a single queue entry by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const entry = await db.queueEntry.findUnique({
      where: { id },
      include: {
        counter: {
          select: { id: true, name: true },
        },
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Antrian tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(entry)
  } catch (error: any) {
    console.error('[GET /api/antrian/:id] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data antrian', detail: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/antrian/[id]
 * Partial update a queue entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.queueEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Antrian tidak ditemukan' }, { status: 404 })
    }

    const updateData: any = {}

    if (body.status) {
      const validStatuses = ['menunggu', 'dipanggil', 'dilayani', 'selesai', 'dilewati']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Status tidak valid: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = body.status

      if (body.status === 'dipanggil') updateData.calledAt = new Date()
      if (body.status === 'dilayani') updateData.servedAt = new Date()
      if (body.status === 'selesai') updateData.completedAt = new Date()
    }

    if (body.counterId !== undefined) {
      updateData.counterId = body.counterId
    }

    const updated = await db.queueEntry.update({
      where: { id },
      data: updateData,
      include: { counter: { select: { id: true, name: true } } },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('[PATCH /api/antrian/:id] Error:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui antrian', detail: error.message },
      { status: 500 }
    )
  }
}
