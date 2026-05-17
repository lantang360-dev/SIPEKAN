import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nomorRegistrasi } = body

    if (!nomorRegistrasi || !nomorRegistrasi.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nomor registrasi wajib diisi' },
        { status: 400 }
      )
    }

    // Lookup by nomorRegistrasi
    const registration = await db.registration.findFirst({
      where: {
        nomorRegistrasi: {
          contains: nomorRegistrasi.trim(),
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
        verifiedByPetugas: {
          select: {
            id: true,
            nama: true,
            jabatan: true,
            nip: true,
          },
        },
        verifications: {
          orderBy: { createdAt: 'desc' },
          include: {
            petugas: {
              select: {
                id: true,
                nama: true,
                jabatan: true,
                nip: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!registration) {
      return NextResponse.json(
        { success: false, message: 'Pendaftaran tidak ditemukan. Pastikan nomor registrasi benar dan pendaftaran sudah diverifikasi.' },
        { status: 404 }
      )
    }

    // Only allow printing for verified registrations
    if (registration.status !== 'diverifikasi') {
      return NextResponse.json(
        { success: false, message: `Pendaftaran belum diverifikasi. Status saat ini: ${registration.status}` },
        { status: 400 }
      )
    }

    // Generate surat number (sequential per day)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayPrintCount = await db.registration.count({
      where: {
        status: 'diverifikasi',
        verifiedBy: { not: null },
      },
    })

    const suratNumber = `SIB-${String(todayStart.getFullYear()).slice(2)}${String(todayStart.getMonth() + 1).padStart(2, '0')}${String(todayStart.getDate()).padStart(2, '0')}-${String(todayPrintCount + 1).padStart(4, '0')}`

    // Get lapas info from pengaturan (optional)
    const settings = await db.pengaturan.findMany({
      where: { key: { startsWith: 'lapas_' } },
    })
    const getSetting = (key: string, fallback: string = ''): string => {
      const s = settings.find((s) => s.key === key)
      return s ? s.value : fallback
    }

    const lapasInfo = {
      nama: getSetting('lapas_nama', 'LAPAS KLAS IIA BALIKPAPAN'),
      alamat: getSetting('lapas_alamat', 'Jl. Jend. Sudirman No. 1, Balikpapan, Kalimantan Timur'),
      kanwil: getSetting('lapas_kanwil', 'KANWIL KEMENKUMHAM KALIMANTAN TIMUR'),
      ditjen: getSetting('lapas_ditjen', 'DITJEN PAS'),
    }

    return NextResponse.json({
      success: true,
      data: {
        ...registration,
        suratNumber,
        lapasInfo,
        tanggalCetak: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('POST surat-izin error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
