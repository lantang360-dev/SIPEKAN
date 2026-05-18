import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const settings = await db.pengaturan.findMany({
      orderBy: { key: 'asc' },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    return NextResponse.json({
      success: true,
      data: settingsMap,
    })
  } catch (error) {
    console.error('GET pengaturan error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Format settings tidak valid' },
        { status: 400 }
      )
    }

    const labels: Record<string, string> = {
      wa_enabled: 'WhatsApp Aktif',
      wa_provider: 'WhatsApp Provider',
      wa_token: 'WhatsApp API Token',
      wa_sender_number: 'Nomor Pengirim',
      wa_app_name: 'Nama Aplikasi',
    }

    const results = await Promise.all(
      Object.entries(settings).map(async ([key, value]) => {
        return db.pengaturan.upsert({
          where: { key },
          update: { value: String(value) },
          create: {
            key,
            value: String(value),
            label: labels[key] || key,
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      message: 'Pengaturan berhasil disimpan',
      data: results.length,
    })
  } catch (error) {
    console.error('PUT pengaturan error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registrationId } = body

    if (!registrationId) {
      return NextResponse.json(
        { success: false, message: 'registrationId wajib diisi' },
        { status: 400 }
      )
    }

    const notifikasi = await db.notifikasi.findMany({
      where: { registrationId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: notifikasi,
    })
  } catch (error) {
    console.error('POST notifikasi history error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
