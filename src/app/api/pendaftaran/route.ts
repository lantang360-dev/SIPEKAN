import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncToGoogleDrive } from '@/lib/google-drive';

/**
 * GET /api/pendaftaran
 * List all registrations with optional filtering and search.
 * Query params:
 *   - status: filter by status (menunggu, diverifikasi, ditolak)
 *   - search: search by nama, nik, or nomorRegistrasi
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { namaLengkap: { contains: search } },
        { nik: { contains: search } },
        { nomorRegistrasi: { contains: search } },
      ];
    }

    const registrations = await db.registration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(registrations);
  } catch (error: any) {
    console.error('[GET /api/pendaftaran] Error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data pendaftaran', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pendaftaran
 * Create a new registration.
 * Generates nomorRegistrasi as REG-{YYYY}-{autoIncrement}.
 * After creating, syncs to Google Drive.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Generate nomorRegistrasi: REG-{YYYY}-{autoIncrement}
    const year = new Date().getFullYear().toString();

    // Count existing registrations for this year to determine next sequence number
    const registrationsThisYear = await db.registration.findMany({
      where: {
        nomorRegistrasi: {
          startsWith: `REG-${year}-`,
        },
      },
      select: { nomorRegistrasi: true },
    });

    // Extract the highest sequence number
    let maxSequence = 0;
    for (const reg of registrationsThisYear) {
      const parts = reg.nomorRegistrasi.split('-');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSequence) {
          maxSequence = seq;
        }
      }
    }

    const nextSequence = maxSequence + 1;
    const nomorRegistrasi = `REG-${year}-${String(nextSequence).padStart(4, '0')}`;

    // Parse tanggalBesukan from string if provided
    const tanggalBesukan = body.tanggalBesukan
      ? new Date(body.tanggalBesukan)
      : new Date();

    // Create the registration
    const registration = await db.registration.create({
      data: {
        nomorRegistrasi,
        tanggalBesukan,
        namaLengkap: body.namaLengkap,
        nik: body.nik,
        tempatLahir: body.tempatLahir,
        tanggalLahir: body.tanggalLahir,
        jenisKelamin: body.jenisKelamin,
        pekerjaan: body.pekerjaan,
        alamat: body.alamat,
        nomorHP: body.nomorHP,
        email: body.email || null,
        namaWargaBinaan: body.namaWargaBinaan,
        nomorRegistrasiWB: body.nomorRegistrasiWB || null,
        hubungan: body.hubungan,
        tujuan: body.tujuan,
        jumlahPengunjung: body.jumlahPengunjung,
        dokKTP: body.dokKTP ?? false,
        dokKK: body.dokKK ?? false,
        dokSuratDesa: body.dokSuratDesa ?? false,
        dokIzinKhusus: body.dokIzinKhusus ?? false,
        fotoKTPPath: body.fotoKTPPath || null,
        fotoKKPath: body.fotoKKPath || null,
        fotoSuratDesaPath: body.fotoSuratDesaPath || null,
        fotoIzinKhususPath: body.fotoIzinKhususPath || null,
        fotoPengunjungPath: body.fotoPengunjungPath || null,
        catatan: body.catatan || null,
      },
    });

    // Sync to Google Drive in the background (non-blocking)
    syncToGoogleDrive(registration).catch((err) => {
      console.error('[POST /api/pendaftaran] Google Drive sync error:', err);
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/pendaftaran] Error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat pendaftaran', detail: error.message },
      { status: 500 }
    );
  }
}
