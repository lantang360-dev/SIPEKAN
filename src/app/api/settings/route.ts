import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/settings
 * Get all settings or a specific setting
 * 
 * Query params:
 *   - key: get specific setting by key
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key) {
      const setting = await db.appSetting.findUnique({
        where: { key },
      })

      if (!setting) {
        return NextResponse.json({ error: 'Pengaturan tidak ditemukan' }, { status: 404 })
      }

      // Try to parse JSON value
      let parsedValue = setting.value
      try {
        parsedValue = JSON.parse(setting.value)
      } catch {
        // Keep as string if not valid JSON
      }

      return NextResponse.json({
        ...setting,
        value: parsedValue,
      })
    }

    // Get all settings
    const settings = await db.appSetting.findMany({
      orderBy: { key: 'asc' },
    })

    const result: Record<string, any> = {}
    for (const s of settings) {
      try {
        result[s.key] = JSON.parse(s.value)
      } catch {
        result[s.key] = s.value
      }
    }

    return NextResponse.json({
      settings: result,
      raw: settings,
    })
  } catch (error: any) {
    console.error('[GET /api/settings] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil pengaturan', detail: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings
 * Create or update a setting
 * 
 * Body:
 *   - key: setting key
 *   - value: setting value (will be JSON.stringified)
 *   - label: human-readable label
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value, label } = body

    if (!key) {
      return NextResponse.json({ error: 'Key pengaturan diperlukan' }, { status: 400 })
    }

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

    const setting = await db.appSetting.upsert({
      where: { key },
      update: {
        value: stringValue,
        label: label || key,
      },
      create: {
        key,
        value: stringValue,
        label: label || key,
      },
    })

    return NextResponse.json(setting, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/settings] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menyimpan pengaturan', detail: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings
 * Batch update settings
 * 
 * Body:
 *   - settings: Record<string, any> - key-value pairs
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Body harus berisi objek "settings"' },
        { status: 400 }
      )
    }

    const results = []

    for (const [key, value] of Object.entries(settings)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      const setting = await db.appSetting.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue, label: key },
      })
      results.push(setting)
    }

    return NextResponse.json({
      message: `${results.length} pengaturan berhasil diperbarui`,
      updated: results.map(r => r.key),
    })
  } catch (error: any) {
    console.error('[PUT /api/settings] Error:', error)
    return NextResponse.json(
      { error: 'Gagal memperbarui pengaturan', detail: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings
 * Delete a setting
 * 
 * Query params:
 *   - key: setting key to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Key pengaturan diperlukan' }, { status: 400 })
    }

    const existing = await db.appSetting.findUnique({ where: { key } })
    if (!existing) {
      return NextResponse.json({ error: 'Pengaturan tidak ditemukan' }, { status: 404 })
    }

    await db.appSetting.delete({ where: { key } })

    return NextResponse.json({ message: 'Pengaturan berhasil dihapus' })
  } catch (error: any) {
    console.error('[DELETE /api/settings] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus pengaturan', detail: error.message },
      { status: 500 }
    )
  }
}
