import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding SIPEKAN database...')

  // 1. Create default counters (Loket)
  console.log('📍 Creating default counters...')

  const counters = [
    { name: 'Loket 1', serviceType: 'besukan_tatap_muka', order: 1 },
    { name: 'Loket 2', serviceType: 'besukan_tatap_muka', order: 2 },
    { name: 'Loket 3', serviceType: 'penitipan_barang', order: 3 },
  ]

  for (const counter of counters) {
    const created = await prisma.counter.upsert({
      where: { id: `default-${counter.order}` },
      update: counter,
      create: { id: `default-${counter.order}`, ...counter },
    })
    console.log(`  ✅ ${created.name} (${created.serviceType})`)
  }

  // 2. Create default app settings
  console.log('⚙️  Creating default settings...')

  const settings = [
    {
      key: 'app_name',
      value: 'SIPEKAN',
      label: 'Nama Aplikasi',
    },
    {
      key: 'app_subtitle',
      value: 'Sistem Informasi Pelayanan Besukan',
      label: 'Subtitle Aplikasi',
    },
    {
      key: 'institution_name',
      value: 'LAPAS KELAS IIA',
      label: 'Nama Instansi',
    },
    {
      key: 'media_playlist',
      value: JSON.stringify([
        { type: 'youtube', id: 'dQw4w9WgXcQ', title: 'Video Informasi 1' },
      ]),
      label: 'Daftar Media Informasi',
    },
    {
      key: 'display_settings',
      value: JSON.stringify({
        volume: 80,
        autoHideVolume: true,
        volumeHideDelay: 2000,
        showClock: true,
        showDate: true,
        showRunningText: true,
        runningText: 'Selamat datang di SIPEKAN - Sistem Informasi Pelayanan Besukan Lapas. Pastikan membawa dokumen asli yang telah diverifikasi.',
      }),
      label: 'Pengaturan Display',
    },
    {
      key: 'queue_settings',
      value: JSON.stringify({
        dailyAutoReset: true,
        resetTime: '00:00',
        estimatedTimePerVisitor: 3, // minutes
        maxQueuePerDay: 500,
      }),
      label: 'Pengaturan Antrian',
    },
    {
      key: 'whatsapp_enabled',
      value: 'false',
      label: 'WhatsApp Notifikasi Aktif',
    },
    {
      key: 'google_drive_enabled',
      value: 'false',
      label: 'Google Drive Sync Aktif',
    },
  ]

  for (const setting of settings) {
    const created = await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, label: setting.label },
      create: setting,
    })
    console.log(`  ✅ ${created.label}`)
  }

  console.log('')
  console.log('✨ Seed completed successfully!')
  console.log('')
  console.log('Default counters created:')
  console.log('  - Loket 1 (Besukan Tatap Muka)')
  console.log('  - Loket 2 (Besukan Tatap Muka)')
  console.log('  - Loket 3 (Penitipan Barang)')
  console.log('')
  console.log('Run the app: npm run dev')
  console.log('Then visit: http://localhost:3000')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
