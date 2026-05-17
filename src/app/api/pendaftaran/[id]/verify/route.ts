import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendWhatsAppNotification } from '@/lib/whatsapp'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, catatanPetugas, petugasId } = body

    if (!status || !petugasId) {
      return NextResponse.json(
        { success: false, message: 'Status dan petugasId wajib diisi' },
        { status: 400 }
      )
    }

    if (!['diverifikasi', 'ditolak'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Status tidak valid' },
        { status: 400 }
      )
    }

    // Check petugas exists
    const petugas = await db.petugas.findUnique({
      where: { id: petugasId },
    })

    if (!petugas) {
      return NextResponse.json(
        { success: false, message: 'Petugas tidak ditemukan' },
        { status: 400 }
      )
    }

    // Find registration
    const registration = await db.registration.findUnique({
      where: { id },
    })

    if (!registration) {
      return NextResponse.json(
        { success: false, message: 'Pendaftaran tidak ditemukan' },
        { status: 404 }
      )
    }

    if (registration.status !== 'menunggu') {
      return NextResponse.json(
        { success: false, message: `Pendaftaran sudah ${registration.status}, tidak dapat diubah` },
        { status: 400 }
      )
    }

    // Update registration and create verification in transaction
    const updatedRegistration = await db.$transaction(async (tx) => {
      const updated = await tx.registration.update({
        where: { id },
        data: {
          status,
          catatanPetugas: catatanPetugas || null,
          verifiedBy: petugasId,
        },
        include: {
          layanan: {
            select: {
              id: true,
              kode: true,
              nama: true,
              prefix: true,
            },
          },
          verifiedByPetugas: {
            select: {
              id: true,
              nama: true,
              jabatan: true,
            },
          },
        },
      })

      await tx.verification.create({
        data: {
          registrationId: id,
          petugasId,
          action: status,
          catatan: catatanPetugas || null,
        },
      })

      return updated
    })

    // Send WhatsApp notification (non-blocking)
    let notifikasiResult = null
    try {
      notifikasiResult = await sendWhatsAppNotification({
        registrationId: id,
        nomorHP: registration.nomorHP,
        type: status as 'diverifikasi' | 'ditolak',
        namaLengkap: registration.namaLengkap,
        nomorRegistrasi: registration.nomorRegistrasi,
        tanggalBesukan: registration.tanggalBesukan,
        catatan: catatanPetugas || undefined,
        namaWargaBinaan: registration.namaWargaBinaan,
        jumlahPengunjung: registration.jumlahPengunjung,
      })
    } catch (notifError) {
      console.error('WhatsApp notification error:', notifError)
      notifikasiResult = {
        success: false,
        message: notifError instanceof Error ? notifError.message : 'Gagal mengirim notifikasi',
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pendaftaran berhasil ${status}`,
      data: updatedRegistration,
      notifikasi: notifikasiResult,
    })
  } catch (error) {
    console.error('PATCH verify error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
