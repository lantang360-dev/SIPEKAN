import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const layananList = await db.layanan.findMany({
      where: { isActive: true },
      orderBy: { urutan: 'asc' },
      include: {
        counters: {
          where: { isActive: true },
          select: {
            id: true,
            nomor: true,
            nama: true,
          },
        },
        _count: {
          select: {
            counters: true,
            queueTickets: {
              where: {
                status: 'menunggu',
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: layananList,
    })
  } catch (error) {
    console.error('GET layanan error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
