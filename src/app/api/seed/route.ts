import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const force = url.searchParams.get('force') === 'true'

    // If force, delete all existing data first
    if (force) {
      // Delete in correct order due to foreign keys
      await db.notifikasi.deleteMany()
      await db.verification.deleteMany()
      await db.queueCall.deleteMany()
      await db.queueTicket.deleteMany()
      await db.dailySession.deleteMany()
      await db.registration.deleteMany()
      await db.petugas.deleteMany()
      await db.counter.deleteMany()
      await db.layanan.deleteMany()
      await db.pengaturan.deleteMany()
    } else {
      // Check if data already exists
      const existingPetugas = await db.petugas.count()
      if (existingPetugas > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Database sudah memiliki data. Gunakan ?force=true untuk me-reseed.',
          },
          { status: 409 }
        )
      }
    }

    // Hash passwords with bcrypt
    const adminPassword = await bcrypt.hash('admin123', 10)
    const petugasPassword = await bcrypt.hash('petugas123', 10)

    // Create Petugas
    const admin = await db.petugas.create({
      data: {
        username: 'admin',
        password: adminPassword,
        nama: 'Budi Santoso',
        nip: '198501012010011001',
        jabatan: 'Kepala Seksi Pelayanan',
      },
    })

    const petugas1 = await db.petugas.create({
      data: {
        username: 'petugas1',
        password: petugasPassword,
        nama: 'Siti Rahayu',
        nip: '199002152015012001',
        jabatan: 'Petugas Pendaftaran',
      },
    })

    // Create Layanan
    const besukanUmum = await db.layanan.create({
      data: {
        kode: 'besukan-umum',
        nama: 'Besukan Tatap Muka',
        deskripsi: 'Layanan besukan tatap muka dengan warga binaan',
        prefix: 'B',
        estimasi: '10-20 menit',
        urutan: 1,
      },
    })

    const penitipanBarang = await db.layanan.create({
      data: {
        kode: 'penitipan-barang',
        nama: 'Penitipan Barang',
        deskripsi: 'Layanan penitipan barang untuk warga binaan',
        prefix: 'P',
        estimasi: '10-20 menit',
        urutan: 2,
      },
    })

    // Create Counters
    const counter1 = await db.counter.create({
      data: {
        nomor: 1,
        nama: 'Counter 1',
        layananId: besukanUmum.id,
      },
    })

    const counter2 = await db.counter.create({
      data: {
        nomor: 2,
        nama: 'Counter 2',
        layananId: besukanUmum.id,
      },
    })

    const counter3 = await db.counter.create({
      data: {
        nomor: 3,
        nama: 'Counter 3',
        layananId: penitipanBarang.id,
      },
    })

    // Create Daily Sessions
    const today = getStartOfDay()

    for (const counter of [counter1, counter2, counter3]) {
      await db.dailySession.create({
        data: {
          tanggal: today,
          counterId: counter.id,
          currentNumber: 1,
        },
      })
    }

    // Create Registrations
    const todayDate = new Date()

    const registrations = [
      {
        nomorRegistrasi: 'B-0001',
        tanggalBesukan: todayDate,
        status: 'menunggu',
        namaLengkap: 'Ahmad Hidayat',
        nik: '3201010101800001',
        tempatLahir: 'Bandung',
        tanggalLahir: new Date('1980-01-01'),
        jenisKelamin: 'Laki-laki',
        pekerjaan: 'Wiraswasta',
        alamat: 'Jl. Merdeka No. 45, Bandung',
        nomorHP: '081234567890',
        email: 'ahmad.hidayat@email.com',
        namaWargaBinaan: 'Dedi Kurniawan',
        nomorRegistrasiWB: 'WB-2024-0012',
        hubungan: 'Saudara Kandung',
        tujuan: 'Silaturahmi',
        jumlahPengunjung: 2,
        catatan: 'Membawa makanan ringan',
        dokKTP: true,
        dokKK: true,
        dokSuratDesa: true,
        dokIzinKhusus: false,
        layananId: besukanUmum.id,
      },
      {
        nomorRegistrasi: 'B-0002',
        tanggalBesukan: todayDate,
        status: 'menunggu',
        namaLengkap: 'Siti Aminah',
        nik: '3202010201850002',
        tempatLahir: 'Jakarta',
        tanggalLahir: new Date('1985-02-01'),
        jenisKelamin: 'Perempuan',
        pekerjaan: 'Ibu Rumah Tangga',
        alamat: 'Jl. Sudirman No. 12, Jakarta',
        nomorHP: '081345678901',
        namaWargaBinaan: 'Roni Saputra',
        nomorRegistrasiWB: 'WB-2024-0034',
        hubungan: 'Istri',
        tujuan: 'Silaturahmi',
        jumlahPengunjung: 1,
        catatan: null,
        dokKTP: true,
        dokKK: true,
        dokSuratDesa: false,
        dokIzinKhusus: false,
        layananId: besukanUmum.id,
      },
      {
        nomorRegistrasi: 'B-0003',
        tanggalBesukan: todayDate,
        status: 'diverifikasi',
        namaLengkap: 'Dewi Lestari',
        nik: '3203010301900003',
        tempatLahir: 'Surabaya',
        tanggalLahir: new Date('1990-03-01'),
        jenisKelamin: 'Perempuan',
        pekerjaan: 'Pegawai Swasta',
        alamat: 'Jl. Diponegoro No. 78, Surabaya',
        nomorHP: '082345678902',
        email: 'dewi.lestari@email.com',
        namaWargaBinaan: 'Agus Prasetyo',
        nomorRegistrasiWB: 'WB-2024-0056',
        hubungan: 'Orang Tua',
        tujuan: 'Memberikan Barang',
        jumlahPengunjung: 1,
        catatan: 'Membawa pakaian dan buku',
        dokKTP: true,
        dokKK: true,
        dokSuratDesa: true,
        dokIzinKhusus: false,
        layananId: penitipanBarang.id,
        verifiedBy: admin.id,
      },
      {
        nomorRegistrasi: 'B-0004',
        tanggalBesukan: todayDate,
        status: 'ditolak',
        namaLengkap: 'Bambang Setiawan',
        nik: '3204010401750004',
        tempatLahir: 'Semarang',
        tanggalLahir: new Date('1975-04-01'),
        jenisKelamin: 'Laki-laki',
        pekerjaan: 'PNS',
        alamat: 'Jl. Gatot Subroto No. 23, Semarang',
        nomorHP: '083456789003',
        namaWargaBinaan: 'Joko Widodo',
        nomorRegistrasiWB: 'WB-2024-0078',
        hubungan: 'Anak',
        tujuan: 'Konsultasi Hukum',
        jumlahPengunjung: 1,
        catatan: 'Dokumen tidak lengkap',
        catatanPetugas: 'Mohon lengkapi surat izin khusus dari kepala lapas',
        dokKTP: true,
        dokKK: false,
        dokSuratDesa: false,
        dokIzinKhusus: false,
        layananId: besukanUmum.id,
        verifiedBy: petugas1.id,
      },
      {
        nomorRegistrasi: 'B-0005',
        tanggalBesukan: todayDate,
        status: 'menunggu',
        namaLengkap: 'Ratna Sari',
        nik: '3205010501880005',
        tempatLahir: 'Yogyakarta',
        tanggalLahir: new Date('1988-05-01'),
        jenisKelamin: 'Perempuan',
        pekerjaan: 'Guru',
        alamat: 'Jl. Malioboro No. 56, Yogyakarta',
        nomorHP: '084567890004',
        email: 'ratna.sari@email.com',
        namaWargaBinaan: 'Tono Sugiarto',
        nomorRegistrasiWB: 'WB-2024-0090',
        hubungan: 'Suami',
        tujuan: 'Silaturahmi',
        jumlahPengunjung: 3,
        catatan: 'Membawa anak-anak',
        dokKTP: true,
        dokKK: true,
        dokSuratDesa: false,
        dokIzinKhusus: false,
        layananId: besukanUmum.id,
      },
      {
        nomorRegistrasi: 'B-0006',
        tanggalBesukan: todayDate,
        status: 'menunggu',
        namaLengkap: 'Hendra Wijaya',
        nik: '3206010601920006',
        tempatLahir: 'Malang',
        tanggalLahir: new Date('1992-06-01'),
        jenisKelamin: 'Laki-laki',
        pekerjaan: 'Pedagang',
        alamat: 'Jl. Ijen No. 34, Malang',
        nomorHP: '085678900005',
        namaWargaBinaan: 'Fajar Nugroho',
        nomorRegistrasiWB: 'WB-2024-0102',
        hubungan: 'Saudara Kandung',
        tujuan: 'Memberikan Barang',
        jumlahPengunjung: 1,
        catatan: null,
        dokKTP: true,
        dokKK: true,
        dokSuratDesa: true,
        dokIzinKhusus: false,
        layananId: penitipanBarang.id,
      },
    ]

    for (const reg of registrations) {
      await db.registration.create({ data: reg })
    }

    // Create Verification records
    const diverifikasiReg = await db.registration.findUnique({
      where: { nomorRegistrasi: 'B-0003' },
    })
    if (diverifikasiReg) {
      await db.verification.create({
        data: {
          registrationId: diverifikasiReg.id,
          petugasId: admin.id,
          action: 'diverifikasi',
          catatan: 'Dokumen lengkap, pendaftaran disetujui',
        },
      })
    }

    const ditolakReg = await db.registration.findUnique({
      where: { nomorRegistrasi: 'B-0004' },
    })
    if (ditolakReg) {
      await db.verification.create({
        data: {
          registrationId: ditolakReg.id,
          petugasId: petugas1.id,
          action: 'ditolak',
          catatan: 'Dokumen tidak lengkap. Mohon lengkapi surat izin khusus.',
        },
      })
    }

    // Create Pengaturan
    const pengaturanList = [
      { key: 'nama_instansi', value: 'Lapas Kelas IIA Tangerang', label: 'Nama Instansi' },
      { key: 'jam_buka', value: '08:00', label: 'Jam Buka Pelayanan' },
      { key: 'jam_tutup', value: '15:00', label: 'Jam Tutup Pelayanan' },
      { key: 'max_antrian_per_hari', value: '100', label: 'Maks Antrian Per Hari' },
      { key: 'hari_buka', value: 'Senin,Jumat', label: 'Hari Buka Pelayanan' },
    ]
    for (const p of pengaturanList) {
      await db.pengaturan.upsert({
        where: { key: p.key },
        update: { value: p.value, label: p.label },
        create: p,
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: force ? 'Database berhasil di-reseed dengan password yang ter-hash' : 'Database berhasil di-seed',
        data: {
          petugas: 2,
          layanan: 2,
          counters: 3,
          dailySessions: 3,
          registrations: 6,
          verifications: 2,
          pengaturan: 5,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Seed API error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat seeding database', detail: error?.message },
      { status: 500 }
    )
  }
}
