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

async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const settings = await db.pengaturan.findMany({
    where: { key: { startsWith: 'wa_' } },
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

function formatPhoneNumber(nomorHP: string): string {
  let phone = nomorHP.replace(/[\s\-()]/g, '')
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1)
  }
  if (phone.startsWith('+')) {
    phone = phone.substring(1)
  }
  if (!phone.startsWith('62')) {
    phone = '62' + phone
  }
  return phone
}

function buildMessage(type: NotificationType, data: {
  namaLengkap: string
  nomorRegistrasi: string
  tanggalBesukan: string
  catatan?: string
  namaWargaBinaan: string
  jumlahPengunjung: number
  appName?: string
}): string {
  const app = data.appName || 'SIPEKAN'
  const tanggal = new Date(data.tanggalBesukan).toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  if (type === 'diverifikasi') {
    return `*${app} - Pemberitahuan Verifikasi*\n\n` +
      `Assalamualaikum Wr. Wb.\n\n` +
      `Yth. *${data.namaLengkap}*\n\n` +
      `Kami informasikan bahwa pendaftaran besukan Anda telah *DISETUJUI*.\n\n` +
      `Detail Pendaftaran:\n` +
      `- Nomor Registrasi: *${data.nomorRegistrasi}*\n` +
      `- Nama WB: ${data.namaWargaBinaan}\n` +
      `- Tanggal Besukan: ${tanggal}\n` +
      `- Jumlah Pengunjung: ${data.jumlahPengunjung} orang\n` +
      `- Status: *DIVERIFIKASI*\n\n` +
      (data.catatan ? `Catatan Petugas:\n${data.catatan}\n\n` : '') +
      `Hormat kami,\n${app}`
  }

  if (type === 'ditolak') {
    return `*${app} - Pemberitahuan Verifikasi*\n\n` +
      `Yth. *${data.namaLengkap}*\n\n` +
      `Pendaftaran besukan Anda telah *DITOLAK*.\n\n` +
      `- Nomor Registrasi: *${data.nomorRegistrasi}*\n` +
      `- Nama WB: ${data.namaWargaBinaan}\n` +
      `- Status: *DITOLAK*\n\n` +
      (data.catatan ? `Alasan Penolakan:\n${data.catatan}\n\n` : '') +
      `Hormat kami,\n${app}`
  }

  return ''
}

async function sendViaFonnte(token: string, target: string, message: string): Promise<SendResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({ target, message, country_code: '62' }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await response.json()
    const responseStr = JSON.stringify(data)

    if (response.ok && (data.status === true || data.status === 'success')) {
      return { success: true, message: 'Pesan berhasil dikirim via Fonnte', providerResponse: responseStr }
    }
    return { success: false, message: data.reason || data.message || 'Gagal mengirim via Fonnte', providerResponse: responseStr }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error && error.name === 'AbortError'
        ? 'Timeout: Fonnte API tidak merespon dalam 10 detik'
        : `Error koneksi Fonnte: ${error instanceof Error ? error.message : 'Unknown'}`,
    }
  }
}

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
      body: JSON.stringify({ phone: target, message, device: 'default' }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const data = await response.json()
    const responseStr = JSON.stringify(data)

    if (response.ok && data.status === true) {
      return { success: true, message: 'Pesan berhasil dikirim via Wablas', providerResponse: responseStr }
    }
    return { success: false, message: data.message || 'Gagal mengirim via Wablas', providerResponse: responseStr }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error && error.name === 'AbortError'
        ? 'Timeout: Wablas API tidak merespon dalam 10 detik'
        : `Error koneksi Wablas: ${error instanceof Error ? error.message : 'Unknown'}`,
    }
  }
}

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
  const { registrationId, nomorHP, type, namaLengkap, nomorRegistrasi, tanggalBesukan, catatan, namaWargaBinaan, jumlahPengunjung } = params

  const config = await getWhatsAppConfig()
  const formattedPhone = formatPhoneNumber(nomorHP)
  const message = buildMessage(type, {
    namaLengkap, nomorRegistrasi,
    tanggalBesukan: new Date(tanggalBesukan).toISOString(),
    catatan, namaWargaBinaan, jumlahPengunjung,
    appName: config.appName,
  })

  const notifikasi = await db.notifikasi.create({
    data: {
      registrationId,
      nomorHP: formattedPhone,
      tipe: type,
      statusKirim: 'pending',
      pesan: message,
    },
  })

  if (!config.enabled || !config.token) {
    await db.notifikasi.update({
      where: { id: notifikasi.id },
      data: { statusKirim: 'skipped', providerResponse: 'WhatsApp disabled or no token' },
    })
    return { success: false, message: 'Notifikasi WhatsApp dinonaktifkan.', notifikasiId: notifikasi.id }
  }

  let result: SendResult
  switch (config.provider) {
    case 'wablas':
      result = await sendViaWablas(config.token, formattedPhone, message)
      break
    default:
      result = await sendViaFonnte(config.token, formattedPhone, message)
      break
  }

  await db.notifikasi.update({
    where: { id: notifikasi.id },
    data: { statusKirim: result.success ? 'terkirim' : 'gagal', providerResponse: result.providerResponse || result.message },
  })

  return { ...result, notifikasiId: notifikasi.id }
}
