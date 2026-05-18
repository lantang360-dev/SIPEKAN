import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function POST() {
  try {
    const existingPetugas = await db.petugas.count()
    if (existingPetugas > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Database sudah memiliki data.',
        },
        { status: 409 }
      )
    }

    const adminPass = await bcrypt.hash('admin123', 10)
    const petugasPass = await bcrypt.hash('petugas123', 10)

    const admin = await db.petugas.create({
      data: {
        username: 'admin',
        password: adminPass,
        nama: 'Administrator',
        nip: '001001001',
        jabatan: 'Kepala Seksi',
      },
    })

    const petugas1 = await db.petugas.create({
      data: {
        username: 'petugas1',
        password: petugasPass,
        nama: 'Budi Santoso',
        nip: '001001002',
        jabatan: 'Petugas Pendaftaran',
      },
    })

    const besukanUmum = await db.layanan.create({
      data: {
        kode: 'BTM',
        nama: 'Besukan Tatap Muka',
        deskripsi: 'Layanan besukan tatap muka dengan warga binaan',
        prefix: 'B',
        estimasi: '15 menit',
        urutan: 1,
      },
    })

    const penitipanBarang = await db.layanan.create({
      data: {
        kode: 'PBR',
        nama: 'Penitipan Barang',
        deskripsi: 'Layanan penitipan barang untuk warga binaan',
        prefix: 'P',
        estimasi: '10 menit',
        urutan: 2,
      },
    })

    const counter1 = await db.counter.create({
      data: { nomor: 1, nama: 'Loket 1 - Besukan', layananId: besukanUmum.id },
    })
    const counter2 = await db.counter.create({
      data: { nomor: 2, nama: 'Loket 2 - Besukan', layananId: besukanUmum.id },
    })
    const counter3 = await db.counter.create({
      data: { nomor: 3, nama: 'Loket 3 - Penitipan', layananId: penitipanBarang.id },
    })

    const today = getStartOfDay()
    for (const counter of [counter1, counter2, counter3]) {
      await db.dailySession.create({
        data: { tanggal: today, counterId: counter.id, currentNumber: 1 },
      })
    }

    const pengaturan = [
      ['nama_lapas', 'LAPAS KELAS IIA SURABAYA', 'Nama Lapas'],
      ['alamat_lapas', 'Jl. Ahmad Yani No.100, Surabaya', 'Alamat Lapas'],
      ['telepon_lapas', '031-8412345', 'Telepon Lapas'],
      ['jam_buka', '08:00', 'Jam Buka'],
      ['jam_tutup', '12:00', 'Jam Tutup'],
      ['hari_layanan', 'Senin - Jumat', 'Hari Layanan'],
      ['kuota_per_hari', '50', 'Kuota Per Hari'],
      ['maks_pengunjung', '3', 'Maks Pengunjung'],
      ['wa_enabled', 'false', 'WhatsApp Aktif'],
      ['wa_api_url', '', 'WhatsApp API URL'],
      ['wa_api_key', '', 'WhatsApp API Key'],
      ['antrian_prefix', 'SIPEKAN', 'Prefix Sistem'],
    ]
    for (const [key, value, label] of pengaturan) {
      await db.pengaturan.create({
        data: { id: `pgt_${key}`, key, value, label },
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Database berhasil di-seed',
        data: {
          petugas: 2,
          layanan: 2,
          counters: 3,
          dailySessions: 3,
          pengaturan: 12,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Seed API error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat seeding database' },
      { status: 500 }
    )
  }
}
