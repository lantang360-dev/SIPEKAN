import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/password'

function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

async function main() {
  console.log('🌱 Seeding database...')

  // Check if data already exists
  const existingPetugas = await db.petugas.count()
  if (existingPetugas > 0) {
    console.log('⚠️  Database already seeded. Skipping...')
    return
  }

  // Create Petugas (passwords are bcrypt-hashed)
  console.log('👤 Creating petugas...')
  const adminPassword = await hashPassword('admin123')
  const petugasPassword = await hashPassword('petugas123')

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

  console.log(`  ✅ Created ${admin.nama} (${admin.username})`)
  console.log(`  ✅ Created ${petugas1.nama} (${petugas1.username})`)

  // Create Layanan
  console.log('📋 Creating layanan...')
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

  console.log(`  ✅ Created ${besukanUmum.nama} (prefix: ${besukanUmum.prefix})`)
  console.log(`  ✅ Created ${penitipanBarang.nama} (prefix: ${penitipanBarang.prefix})`)

  // Create Counters
  console.log('🖥️  Creating counters...')
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

  console.log(`  ✅ Created ${counter1.nama} → ${besukanUmum.nama}`)
  console.log(`  ✅ Created ${counter2.nama} → ${besukanUmum.nama}`)
  console.log(`  ✅ Created ${counter3.nama} → ${penitipanBarang.nama}`)

  // Create Daily Sessions for today
  console.log('📅 Creating daily sessions...')
  const today = getStartOfDay()

  for (const counter of [counter1, counter2, counter3]) {
    await db.dailySession.create({
      data: {
        tanggal: today,
        counterId: counter.id,
        currentNumber: 1,
      },
    })
    console.log(`  ✅ Created DailySession for ${counter.nama}`)
  }

  // Create Registrations (using B-NNNN format)
  console.log('📝 Creating registrations...')
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
    console.log(`  ✅ Created ${reg.nomorRegistrasi} - ${reg.namaLengkap} (${reg.status})`)
  }

  // Create Verification records
  console.log('✅ Creating verification records...')

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
    console.log('  ✅ Created verification for B-0003')
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
    console.log('  ✅ Created verification for B-0004')
  }

  // Create default Pengaturan (system settings)
  console.log('⚙️  Creating default settings...')
  const defaultSettings = [
    { key: 'lapas_nama', value: 'LAPAS KLAS IIA BALIKPAPAN', label: 'Nama Lapas' },
    { key: 'lapas_alamat', value: 'Jl. Jend. Sudirman No. 1, Balikpapan, Kalimantan Timur', label: 'Alamat Lapas' },
    { key: 'lapas_kanwil', value: 'KANWIL KEMENKUMHAM KALIMANTAN TIMUR', label: 'Kantor Wilayah' },
    { key: 'lapas_ditjen', value: 'DITJEN PAS', label: 'Direktorat Jenderal' },
    { key: 'wa_enabled', value: 'false', label: 'WhatsApp Aktif' },
    { key: 'wa_provider', value: 'fonnte', label: 'WhatsApp Provider' },
    { key: 'wa_token', value: '', label: 'WhatsApp API Token' },
    { key: 'wa_sender_number', value: '', label: 'Nomor Pengirim' },
    { key: 'wa_app_name', value: 'SIPEKAN - Lapas', label: 'Nama Aplikasi' },
    { key: 'jam_buka', value: '08:00', label: 'Jam Buka Layanan' },
    { key: 'jam_tutup', value: '15:00', label: 'Jam Tutup Layanan' },
    { key: 'max_pengunjung', value: '5', label: 'Maks Pengunjung Per Orang' },
  ]

  for (const setting of defaultSettings) {
    await db.pengaturan.create({ data: setting })
    console.log(`  ✅ Setting: ${setting.label}`)
  }

  console.log('\n✨ Seed completed successfully!')
  console.log(`   👤 Petugas: 2 (admin/admin123, petugas1/petugas123)`)
  console.log(`   📋 Layanan: 2`)
  console.log(`   🖥️  Counters: 3`)
  console.log(`   📅 Daily Sessions: 3`)
  console.log(`   📝 Registrations: 6`)
  console.log(`   ✅ Verifications: 2`)
  console.log(`   ⚙️  Settings: ${defaultSettings.length}`)
  console.log('\n   🔑 Login: admin / admin123')
}

main()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
