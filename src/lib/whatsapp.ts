import { db } from '@/lib/db'

type NotificationType = 'diverifikasi' | 'ditolak' | 'menunggu'

interface WhatsAppConfig {
  enabled: boolean
  provider: string
  token: string
  senderNumber?: string
  appName?: string
}

interface SendResult {
  success: boolean
  message: string
  providerResponse?: string
}

// Get WhatsApp configuration from database settings
async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const settings = await db.pengaturan.findMany({
    where: {
      key: {
        startsWith: 'wa_',
      },
    },
  })

  const get = (key: string, fallback: string = ''): string => {
    const s = settings.find((s) => s.key === key)
    return s ? s.value : fallback
  }

  return {
    enabled: get('wa_enabled', 'false') === 'true',
    provider: get('wa_provider', 'fonnte'),
    token: get('wa_token', ''),
    senderNumber: get('wa_sender_number', ''),
    appName: get('wa_app_name', 'SIPEKAN - Lapas'),
  }
}

// Format phone number to international format
function formatPhoneNumber(nomorHP: string): string {
  let phone = nomorHP.replace(/[\s\-()]/g, '')

  // Remove leading 0 and add country code 62 (Indonesia)
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1)
  }

  // Remove + prefix if exists
  if (phone.startsWith('+')) {
    phone = phone.substring(1)
  }

  // Already has country code
  if (!phone.startsWith('62')) {
    phone = '62' + phone
  }

  return phone
}

// Build notification message
function buildMessage(
  type: NotificationType,
  data: {
    namaLengkap: string
    nomorRegistrasi: string
    tanggalBesukan: string
    catatan?: string
    namaWargaBinaan: string
    jumlahPengunjung: number
    appName?: string
  }
): string {
  const app = data.appName || 'SIPEKAN'
  const tanggal = new Date(data.tanggalBesukan).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (type === 'diverifikasi') {
    return `*${app} - Pemberitahuan Verifikasi*\n\n` +
      `Assalamualaikum Wr. Wb.\n\n` +
      `Yth. *${data.namaLengkap}*\n\n` +
      `Kami informasikan bahwa pendaftaran besukan Anda telah *DISETUJUI*.\n\n` +
      `📋 *Detail Pendaftaran:*\n` +
      `├ Nomor Registrasi: *${data.nomorRegistrasi}*\n` +
      `├ Nama WB: ${data.namaWargaBinaan}\n` +
      `├ Tanggal Besukan: ${tanggal}\n` +
      `├ Jumlah Pengunjung: ${data.jumlahPengunjung} orang\n` +
      `└ Status: ✅ *DIVERIFIKASI*\n\n` +
      (data.catatan ? `📝 *Catatan Petugas:*\n${data.catatan}\n\n` : '') +
      `Harap datang pada tanggal yang ditentukan dengan membawa:\n` +
      `• KTP Asli\n` +
      `• Kartu Keluarga\n` +
      `• Surat Keterangan Desa/Kelurahan\n\n` +
      `Perhatikan jadwal besukan:\n` +
      `📅 Senin-Kamis: 08:00-15:00 WITA\n` +
      `📅 Sabtu: 08:00-12:00 WITA\n\n` +
      `Hormat kami,\n${app}`
  }

  if (type === 'ditolak') {
    return `*${app} - Pemberitahuan Verifikasi*\n\n` +
      `Assalamualaikum Wr. Wb.\n\n` +
      `Yth. *${data.namaLengkap}*\n\n` +
      `Kami informasikan bahwa pendaftaran besukan Anda telah *DITOLAK*.\n\n` +
      `📋 *Detail Pendaftaran:*\n` +
      `├ Nomor Registrasi: *${data.nomorRegistrasi}*\n` +
      `├ Nama WB: ${data.namaWargaBinaan}\n` +
      `└ Status: ❌ *DITOLAK*\n\n` +
      (data.catatan ? `📝 *Alasan Penolakan:*\n${data.catatan}\n\n` : '') +
      `Jika Anda merasa ini merupakan kesalahan, silakan:\n` +
      `• Hubungi kantor Lapas\n` +
      `• Ajukan pendaftaran ulang dengan kelengkapan dokumen yang benar\n\n` +
      `Hormat kami,\n${app}`
  }

  return ''
}

// Send via Fonnte API
async function sendViaFonnte(token: string, target: string, message: string): Promise<SendResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        target,
        message,
        country_code: '62',
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await response.json()
    const responseStr = JSON.stringify(data)

    if (response.ok && (data.status === true || data.status === 'success')) {
      return {
        success: true,
        message: 'Pesan berhasil dikirim via Fonnte',
        providerResponse: responseStr,
      }
    }

    return {
      success: false,
      message: data.reason || data.message || 'Gagal mengirim via Fonnte',
      providerResponse: responseStr,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: 'Timeout: Fonnte API tidak merespon dalam 10 detik',
      }
    }
    return {
      success: false,
      message: `Error koneksi Fonnte: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// Send via Wablas API
async function sendViaWablas(token: string, target: string, message: string): Promise<SendResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch('https://api.wablas.com/v1/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        phone: target,
        message,
        device: 'default',
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await response.json()
    const responseStr = JSON.stringify(data)

    if (response.ok && data.status === true) {
      return {
        success: true,
        message: 'Pesan berhasil dikirim via Wablas',
        providerResponse: responseStr,
      }
    }

    return {
      success: false,
      message: data.message || 'Gagal mengirim via Wablas',
      providerResponse: responseStr,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: 'Timeout: Wablas API tidak merespon dalam 10 detik',
      }
    }
    return {
      success: false,
      message: `Error koneksi Wablas: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// Main function to send WhatsApp notification
export async function sendWhatsAppNotification(params: {
  registrationId: string
  nomorHP: string
  type: NotificationType
  namaLengkap: string
  nomorRegistrasi: string
  tanggalBesukan: string | Date
  catatan?: string
  namaWargaBinaan: string
  jumlahPengunjung: number
}): Promise<SendResult & { notifikasiId?: string }> {
  const {
    registrationId,
    nomorHP,
    type,
    namaLengkap,
    nomorRegistrasi,
    tanggalBesukan,
    catatan,
    namaWargaBinaan,
    jumlahPengunjung,
  } = params

  // Get config
  const config = await getWhatsAppConfig()

  // Format phone number
  const formattedPhone = formatPhoneNumber(nomorHP)

  // Build message
  const message = buildMessage(type, {
    namaLengkap,
    nomorRegistrasi,
    tanggalBesukan: new Date(tanggalBesukan).toISOString(),
    catatan,
    namaWargaBinaan,
    jumlahPengunjung,
    appName: config.appName,
  })

  // Log notification to database (initial status: pending)
  const notifikasi = await db.notifikasi.create({
    data: {
      registrationId,
      nomorHP: formattedPhone,
      tipe: type,
      statusKirim: 'pending',
      pesan: message,
    },
  })

  // If WhatsApp is disabled, mark as skipped
  if (!config.enabled || !config.token) {
    await db.notifikasi.update({
      where: { id: notifikasi.id },
      data: {
        statusKirim: 'skipped',
        providerResponse: 'WhatsApp notification disabled or no token configured',
      },
    })

    return {
      success: false,
      message: 'Notifikasi WhatsApp dinonaktifkan. Token belum dikonfigurasi.',
      notifikasiId: notifikasi.id,
    }
  }

  // Send based on provider
  let result: SendResult

  switch (config.provider) {
    case 'wablas':
      result = await sendViaWablas(config.token, formattedPhone, message)
      break
    case 'fonnte':
    default:
      result = await sendViaFonnte(config.token, formattedPhone, message)
      break
  }

  // Update notification status in database
  await db.notifikasi.update({
    where: { id: notifikasi.id },
    data: {
      statusKirim: result.success ? 'terkirim' : 'gagal',
      providerResponse: result.providerResponse || result.message,
    },
  })

  return {
    ...result,
    notifikasiId: notifikasi.id,
  }
}

// Get notification history for a registration
export async function getNotifikasiHistory(registrationId: string) {
  return db.notifikasi.findMany({
    where: { registrationId },
    orderBy: { createdAt: 'desc' },
  })
}
