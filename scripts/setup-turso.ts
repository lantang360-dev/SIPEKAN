import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

async function setupTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    console.error('❌ TURSO_DATABASE_URL tidak ditemukan!');
    console.error('Set dulu: export TURSO_DATABASE_URL=libsql://...');
    process.exit(1);
  }

  console.log('🔌 Menghubungkan ke Turso...');
  const client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    await client.execute('SELECT 1');
    console.log('✅ Koneksi berhasil!');
  } catch (e: any) {
    console.error('❌ Gagal koneksi ke Turso:', e.message);
    process.exit(1);
  }

  console.log('\n📋 Membuat tabel...');
  const statements = [
    `CREATE TABLE IF NOT EXISTS "petugas" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "username" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "nama" TEXT NOT NULL,
      "nip" TEXT NOT NULL,
      "jabatan" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "layanan" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "kode" TEXT NOT NULL,
      "nama" TEXT NOT NULL,
      "deskripsi" TEXT NOT NULL,
      "prefix" TEXT NOT NULL,
      "estimasi" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "urutan" INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS "counter" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "nomor" INTEGER NOT NULL,
      "nama" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "layananId" TEXT NOT NULL,
      CONSTRAINT "counter_layananId_fkey" FOREIGN KEY ("layananId") REFERENCES "layanan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "queue_call" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "nomorAntrian" TEXT NOT NULL,
      "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "counterId" TEXT NOT NULL,
      "petugasId" TEXT NOT NULL,
      CONSTRAINT "queue_call_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "counter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "queue_call_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "petugas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "queue_ticket" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "nomorAntrian" TEXT NOT NULL,
      "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "waktuAmbil" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "status" TEXT NOT NULL DEFAULT 'menunggu',
      "layananId" TEXT NOT NULL,
      "callId" TEXT,
      "dipanggilPada" DATETIME,
      "selesaiPada" DATETIME,
      "dipanggilDi" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "queue_ticket_layananId_fkey" FOREIGN KEY ("layananId") REFERENCES "layanan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "queue_ticket_callId_fkey" FOREIGN KEY ("callId") REFERENCES "queue_call" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "daily_session" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tanggal" DATETIME NOT NULL,
      "counterId" TEXT NOT NULL,
      "currentNumber" INTEGER NOT NULL DEFAULT 0,
      "totalCalled" INTEGER NOT NULL DEFAULT 0,
      "totalMenunggu" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "daily_session_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "counter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "registration" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "nomorRegistrasi" TEXT NOT NULL,
      "tanggalDaftar" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "tanggalBesukan" DATETIME NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'menunggu',
      "catatanPetugas" TEXT,
      "namaLengkap" TEXT NOT NULL,
      "nik" TEXT NOT NULL,
      "tempatLahir" TEXT NOT NULL,
      "tanggalLahir" DATETIME NOT NULL,
      "jenisKelamin" TEXT NOT NULL,
      "pekerjaan" TEXT NOT NULL,
      "alamat" TEXT NOT NULL,
      "nomorHP" TEXT NOT NULL,
      "email" TEXT,
      "namaWargaBinaan" TEXT NOT NULL,
      "nomorRegistrasiWB" TEXT,
      "hubungan" TEXT NOT NULL,
      "tujuan" TEXT NOT NULL,
      "jumlahPengunjung" INTEGER NOT NULL,
      "catatan" TEXT,
      "dokKTP" BOOLEAN NOT NULL DEFAULT false,
      "dokKK" BOOLEAN NOT NULL DEFAULT false,
      "dokSuratDesa" BOOLEAN NOT NULL DEFAULT false,
      "dokIzinKhusus" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "layananId" TEXT NOT NULL,
      "verifiedBy" TEXT,
      CONSTRAINT "registration_layananId_fkey" FOREIGN KEY ("layananId") REFERENCES "layanan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "registration_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "petugas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "verification" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "registrationId" TEXT NOT NULL,
      "petugasId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "catatan" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "verification_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "verification_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "petugas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "notifikasi" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "registrationId" TEXT NOT NULL,
      "nomorHP" TEXT NOT NULL,
      "tipe" TEXT NOT NULL,
      "statusKirim" TEXT NOT NULL DEFAULT 'pending',
      "pesan" TEXT NOT NULL,
      "providerResponse" TEXT,
      "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "notifikasi_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "pengaturan" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "petugas_username_key" ON "petugas"("username")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "petugas_nip_key" ON "petugas"("nip")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "layanan_kode_key" ON "layanan"("kode")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "counter_nomor_key" ON "counter"("nomor")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "queue_ticket_callId_key" ON "queue_ticket"("callId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "queue_ticket_nomorAntrian_tanggal_key" ON "queue_ticket"("nomorAntrian", "tanggal")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "daily_session_tanggal_counterId_key" ON "daily_session"("tanggal", "counterId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "registration_nomorRegistrasi_key" ON "registration"("nomorRegistrasi")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "pengaturan_key_key" ON "pengaturan"("key")`,
    `CREATE INDEX IF NOT EXISTS "registration_status_idx" ON "registration"("status")`,
    `CREATE INDEX IF NOT EXISTS "queue_ticket_status_idx" ON "queue_ticket"("status")`,
    `CREATE INDEX IF NOT EXISTS "queue_ticket_layananId_idx" ON "queue_ticket"("layananId")`,
    `CREATE INDEX IF NOT EXISTS "queue_ticket_tanggal_idx" ON "queue_ticket"("tanggal")`,
    `CREATE INDEX IF NOT EXISTS "queue_call_counterId_idx" ON "queue_call"("counterId")`,
    `CREATE INDEX IF NOT EXISTS "queue_call_petugasId_idx" ON "queue_call"("petugasId")`,
    `CREATE INDEX IF NOT EXISTS "daily_session_tanggal_idx" ON "daily_session"("tanggal")`,
    `CREATE INDEX IF NOT EXISTS "notifikasi_registrationId_idx" ON "notifikasi"("registrationId")`,
    `CREATE INDEX IF NOT EXISTS "notifikasi_statusKirim_idx" ON "notifikasi"("statusKirim")`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }
  console.log('✅ Semua tabel berhasil dibuat!');

  console.log('\n🌱 Seeding data...');
  const adminPass = await bcrypt.hash('admin123', 10);
  const petugasPass = await bcrypt.hash('petugas123', 10);

  const existing = await client.execute('SELECT COUNT(*) as count FROM petugas');
  if (existing.rows[0].count > 0) {
    console.log('⚠️ Data sudah ada, skip seeding');
    return;
  }

  await client.execute({ sql: `INSERT INTO petugas (id, username, password, nama, nip, jabatan, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, args: ['petugas_admin_001', 'admin', adminPass, 'Administrator', '001001001', 'Kepala Seksi'] });
  await client.execute({ sql: `INSERT INTO petugas (id, username, password, nama, nip, jabatan, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, args: ['petugas_001', 'petugas1', petugasPass, 'Budi Santoso', '001001002', 'Petugas Pendaftaran'] });
  console.log('✅ 2 Petugas');

  await client.execute({ sql: `INSERT INTO layanan (id, kode, nama, deskripsi, prefix, estimasi) VALUES (?, ?, ?, ?, ?, ?)`, args: ['layanan_001', 'BTM', 'Besukan Tatap Muka', 'Layanan besukan tatap muka', 'B', '15 menit'] });
  await client.execute({ sql: `INSERT INTO layanan (id, kode, nama, deskripsi, prefix, estimasi) VALUES (?, ?, ?, ?, ?, ?)`, args: ['layanan_002', 'PBR', 'Penitipan Barang', 'Layanan penitipan barang', 'P', '10 menit'] });
  console.log('✅ 2 Layanan');

  await client.execute({ sql: `INSERT INTO counter (id, nomor, nama, layananId, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`, args: ['counter_001', 1, 'Loket 1 - Besukan', 'layanan_001'] });
  await client.execute({ sql: `INSERT INTO counter (id, nomor, nama, layananId, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`, args: ['counter_002', 2, 'Loket 2 - Besukan', 'layanan_001'] });
  await client.execute({ sql: `INSERT INTO counter (id, nomor, nama, layananId, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`, args: ['counter_003', 3, 'Loket 3 - Penitipan', 'layanan_002'] });
  console.log('✅ 3 Counter');

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
  ];
  for (const [key, value, label] of pengaturan) {
    await client.execute({ sql: `INSERT INTO pengaturan (id, key, value, label, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`, args: [`pgt_${key}`, key, value, label] });
  }
  console.log('✅ 12 Pengaturan');

  console.log('\n============================================');
  console.log('  ✅ Setup Turso Berhasil!');
  console.log('============================================');
  console.log('  🔑 Admin:    admin / admin123');
  console.log('  🔑 Petugas:  petugas1 / petugas123');
  console.log('============================================\n');
}

setupTurso().catch((e: any) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
