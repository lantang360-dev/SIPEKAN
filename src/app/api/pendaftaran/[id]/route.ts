import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  sendWhatsAppNotification,
  generateVerificationMessage,
  generateRejectionMessage,
} from '@/lib/whatsapp';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pendaftaran/[id]
 * Get a single registration by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const registration = await db.registration.findUnique({
      where: { id },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Pendaftaran tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(registration);
  } catch (error: any) {
    console.error('[GET /api/pendaftaran/:id] Error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data pendaftaran', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pendaftaran/[id]
 * Update a registration (verify or reject).
 * Body: { status: 'diverifikasi' | 'ditolak', catatanPetugas, petugasVerifikator }
 * Sends WhatsApp notification after updating.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate status
    const validStatuses = ['menunggu', 'diverifikasi', 'ditolak'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Status tidak valid. Harus salah satu dari: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if registration exists
    const existing = await db.registration.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Pendaftaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.catatanPetugas !== undefined) {
      updateData.catatanPetugas = body.catatanPetugas;
    }
    if (body.petugasVerifikator !== undefined) {
      updateData.petugasVerifikator = body.petugasVerifikator;
    }

    // Update the registration
    const updatedRegistration = await db.registration.update({
      where: { id },
      data: updateData,
    });

    // Send WhatsApp notification based on the new status
    if (updatedRegistration.nomorHP) {
      if (updatedRegistration.status === 'diverifikasi') {
        const message = generateVerificationMessage(updatedRegistration);
        const waUrl = sendWhatsAppNotification(updatedRegistration.nomorHP, message);
        console.log(`[WhatsApp] Verification notification URL generated for ${updatedRegistration.nomorRegistrasi}: ${waUrl}`);
      } else if (updatedRegistration.status === 'ditolak') {
        const message = generateRejectionMessage(updatedRegistration);
        const waUrl = sendWhatsAppNotification(updatedRegistration.nomorHP, message);
        console.log(`[WhatsApp] Rejection notification URL generated for ${updatedRegistration.nomorRegistrasi}: ${waUrl}`);
      }
    }

    return NextResponse.json(updatedRegistration);
  } catch (error: any) {
    console.error('[PUT /api/pendaftaran/:id] Error:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui pendaftaran', detail: error.message },
      { status: 500 }
    );
  }
}
