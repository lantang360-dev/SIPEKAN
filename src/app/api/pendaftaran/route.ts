import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const date = searchParams.get('date')

    const where: Prisma.RegistrationWhereInput = {}

    if (status) {
      where.status = status
    }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.tanggalBesukan = {
        gte: startDate,
        lte: endDate,
      }
    }

    if (search) {
      where.OR = [
        { namaLengkap: { contains: search } },
        { nomorRegistrasi: { contains: search } },
        { namaWargaBinaan: { contains: search } },
        { nik: { contains: search } },
      ]
    }

    const skip = (page - 1) * limit

    const [registrations, totalCount] = await Promise.all([
      db.registration.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.registration.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: registrations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error('GET pendaftaran error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const requiredFields = [
      'namaLengkap',
      'nik',
      'tempatLahir',
      'tanggalLahir',
      'jenisKelamin',
      'pekerjaan',
      'alamat',
      'nomorHP',
      'namaWargaBinaan',
      'hubungan',
      'tujuan',
      'jumlahPengunjung',
      'layananId',
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `Field ${field} wajib diisi` },
          { status: 400 }
        )
      }
    }

    // Check layanan exists
    const layanan = await db.layanan.findUnique({
      where: { id: body.layananId },
    })

    if (!layanan) {
      return NextResponse.json(
        { success: false, message: 'Layanan tidak ditemukan' },
        { status: 400 }
      )
    }

    // Auto-generate nomor registrasi (simple format: B-NNNN)
    const prefix = 'B-'

    const lastRegistration = await db.registration.findFirst({
      where: {
        nomorRegistrasi: {
          startsWith: prefix,
        },
      },
      orderBy: { nomorRegistrasi: 'desc' },
      select: { nomorRegistrasi: true },
    })

    let nextNumber = 1
    if (lastRegistration) {
      const lastNumberStr = lastRegistration.nomorRegistrasi.replace(prefix, '')
      nextNumber = parseInt(lastNumberStr, 10) + 1
    }

    const nomorRegistrasi = `${prefix}${String(nextNumber).padStart(4, '0')}`

    // Check tanggalBesukan - default to today if not provided
    const tanggalBesukan = body.tanggalBesukan
      ? new Date(body.tanggalBesukan)
      : new Date()

    const registration = await db.registration.create({
      data: {
        nomorRegistrasi,
        tanggalBesukan,
        namaLengkap: body.namaLengkap,
        nik: body.nik,
        tempatLahir: body.tempatLahir,
        tanggalLahir: new Date(body.tanggalLahir),
        jenisKelamin: body.jenisKelamin,
        pekerjaan: body.pekerjaan,
        alamat: body.alamat,
        nomorHP: body.nomorHP,
        email: body.email || null,
        namaWargaBinaan: body.namaWargaBinaan,
        nomorRegistrasiWB: body.nomorRegistrasiWB || null,
        hubungan: body.hubungan,
        tujuan: body.tujuan,
        jumlahPengunjung: parseInt(body.jumlahPengunjung, 10),
        catatan: body.catatan || null,
        dokKTP: body.dokKTP || false,
        dokKK: body.dokKK || false,
        dokSuratDesa: body.dokSuratDesa || false,
        dokIzinKhusus: body.dokIzinKhusus || false,
        layananId: body.layananId,
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
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Pendaftaran berhasil',
        data: registration,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST pendaftaran error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { success: false, message: 'NIK sudah terdaftar' },
          { status: 409 }
        )
      }
    }
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
