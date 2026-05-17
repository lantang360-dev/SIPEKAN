/**
 * WhatsApp Notification Helper for SIPEKAN
 * Generates WhatsApp API URLs and formatted notification messages in Indonesian
 */

/**
 * Format a phone number for WhatsApp API.
 * If the number starts with '0', replace it with '62' (Indonesia country code).
 * Strips any non-digit characters before formatting.
 */
export function formatPhone(phone: string): string {
  // Strip non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // If starts with '0', replace with '62'
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.slice(1);
  }

  // If already has country code, return as-is
  return cleaned;
}

/**
 * Generate a WhatsApp API URL for sending a message.
 * Returns the URL that can be opened to initiate a WhatsApp message.
 */
export function sendWhatsAppNotification(phone: string, message: string): string {
  const formattedPhone = formatPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
}

/**
 * Generate a verification approval message in Indonesian.
 */
export function generateVerificationMessage(reg: any): string {
  const lines = [
    `*SIPEKAN - Pemberitahuan Verifikasi Pendaftaran*`,
    ``,
    `Assalamualaikum ${reg.namaLengkap},`,
    ``,
    `Pendaftaran besukan Anda telah *DIVERIFIKASI* oleh petugas kami.`,
    ``,
    `📋 *Detail Pendaftaran:*`,
    `• Nomor Registrasi: ${reg.nomorRegistrasi}`,
    `• Tanggal Besukan: ${formatDate(reg.tanggalBesukan)}`,
    `• Nama Warga Binaan: ${reg.namaWargaBinaan}`,
    `• Jumlah Pengunjung: ${reg.jumlahPengunjung}`,
  ];

  if (reg.catatanPetugas) {
    lines.push(`• Catatan Petugas: ${reg.catatanPetugas}`);
  }

  lines.push(
    ``,
    `Petugas Verifikator: ${reg.petugasVerifikator || '-'}`,
    ``,
    `Harap datang sesuai jadwal dengan membawa dokumen asli yang telah diunggah.`,
    ``,
    `Terima kasih.`,
    `— SIPEKAN Sistem Pelayanan Kunjungan`
  );

  return lines.join('\n');
}

/**
 * Generate a rejection message in Indonesian.
 */
export function generateRejectionMessage(reg: any): string {
  const lines = [
    `*SIPEKAN - Pemberitahuan Pendaftaran Ditolak*`,
    ``,
    `Assalamualaikum ${reg.namaLengkap},`,
    ``,
    `Maaf, pendaftaran besukan Anda telah *DITOLAK* oleh petugas kami.`,
    ``,
    `📋 *Detail Pendaftaran:*`,
    `• Nomor Registrasi: ${reg.nomorRegistrasi}`,
    `• Tanggal Besukan: ${formatDate(reg.tanggalBesukan)}`,
    `• Nama Warga Binaan: ${reg.namaWargaBinaan}`,
  ];

  if (reg.catatanPetugas) {
    lines.push(``);
    lines.push(`📝 *Alasan Penolakan:*`);
    lines.push(`${reg.catatanPetugas}`);
  }

  lines.push(
    ``,
    `Petugas Verifikator: ${reg.petugasVerifikator || '-'}`,
    ``,
    `Silakan lengkapi persyaratan dan ajukan kembali pendaftaran Anda.`,
    ``,
    `Terima kasih.`,
    `— SIPEKAN Sistem Pelayanan Kunjungan`
  );

  return lines.join('\n');
}

/**
 * Helper to format a date string for display.
 */
function formatDate(date: string | Date): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return d.toLocaleDateString('id-ID', options);
}
