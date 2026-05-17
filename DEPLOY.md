# 🚀 SIPEKAN - Panduan Lengkap Instalasi & Deploy ke Vercel

## 📋 Daftar Isi

1. [Persyaratan Sistem](#1-persyaratan-sistem)
2. [Arsitektur Aplikasi](#2-arsitektur-aplikasi)
3. [Setup Database (Neon PostgreSQL)](#3-setup-database-neon-postgresql)
4. [Setup Lokal (Development)](#4-setup-lokal-development)
5. [Konfigurasi Environment Variables](#5-konfigurasi-environment-variables)
6. [Push ke GitHub](#6-push-ke-github)
7. [Deploy ke Vercel](#7-deploy-ke-vercel)
8. [Post-Deploy Setup](#8-post-deploy-setup)
9. [API Documentation](#9-api-documentation)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Persyaratan Sistem

### Software yang dibutuhkan:
| Software | Versi Minimum | Download |
|----------|--------------|----------|
| Node.js | 18.17+ | https://nodejs.org |
| Git | Latest | https://git-scm.com |
| Text Editor | VS Code (Recommended) | https://code.visualstudio.com |

### Akun yang dibutuhkan:
- ✅ [GitHub](https://github.com) - Untuk menyimpan source code
- ✅ [Vercel](https://vercel.com) - Untuk hosting/deploy
- ✅ [Neon](https://neon.tech) - Untuk database PostgreSQL (GRATIS)

### Opsional:
- [Google Cloud Console](https://console.cloud.google.com) - Untuk Google Drive sync
- [Fonnte](https://fonnte.com) atau layanan WhatsApp API - Untuk notifikasi WhatsApp

---

## 2. Arsitektur Aplikasi

```
┌──────────────────────────────────────────────┐
│                  VERCEL                       │
│                                              │
│  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Next.js App  │  │   API Routes           │ │
│  │  (Static)     │  │                        │ │
│  │              │  │  /api/antrian           │ │
│  │  index.html  │  │  /api/counter           │ │
│  │  (Display)   │  │  /api/pendaftaran       │ │
│  │              │  │  /api/settings           │ │
│  │              │  │  /api/panggil            │ │
│  │              │  │  /api/tts                │ │
│  └──────────────┘  └───────────┬────────────┘ │
│                                │              │
└────────────────────────────────┼──────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Neon PostgreSQL       │
                    │    (Cloud Database)      │
                    │                          │
                    │  - registrations         │
                    │  - queue_entries         │
                    │  - counters              │
                    │  - daily_queues          │
                    │  - app_settings          │
                    └──────────────────────────┘
```

### Struktur Folder:

```
sipekan/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Data awal (counters, settings)
├── public/
│   ├── index.html             # Aplikasi utama (display antrian)
│   └── logo.svg               # Logo aplikasi
├── src/
│   ├── app/
│   │   ├── page.tsx           # Entry point (iframe ke index.html)
│   │   ├── layout.tsx         # Root layout
│   │   └── api/
│   │       ├── health/route.ts       # Health check
│   │       ├── antrian/route.ts      # CRUD antrian
│   │       ├── antrian/[id]/route.ts # Detail antrian
│   │       ├── counter/route.ts      # CRUD loket
│   │       ├── pendaftaran/route.ts  # CRUD pendaftaran
│   │       ├── pendaftaran/[id]/route.ts
│   │       ├── panggil/route.ts      # Panggil antrian
│   │       ├── settings/route.ts     # Pengaturan app
│   │       └── tts/route.ts          # Text-to-Speech
│   └── lib/
│       ├── db.ts               # Prisma client
│       ├── google-drive.ts     # Google Drive sync
│       └── whatsapp.ts         # WhatsApp notifications
├── .env.example                # Template environment variables
├── next.config.ts              # Next.js configuration
└── package.json
```

---

## 3. Setup Database (Neon PostgreSQL)

### Langkah 1: Buat Akun Neon
1. Buka https://neon.tech
2. Klik **"Sign Up"** → Login dengan GitHub
3. Klik **"Create Project"**
4. Isi form:
   - **Project Name**: `sipekan-db`
   - **Region**: Pilih yang terdekat (Singapore direkomendasikan)
   - **PostgreSQL Version**: 16 (default)
5. Klik **"Create Project"**

### Langkah 2: Dapatkan Connection String
1. Setelah project dibuat, Anda akan melihat halaman **Dashboard**
2. Klik tab **"Connection Details"**
3. Copy **Connection String** yang formatnya seperti:
   ```
   postgresql://neondb_owner:xxxxx@ep-xxxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **PENTING**: Simpan connection string ini, akan digunakan di langkah berikutnya

### Langkah 3: (Opsional) Buat Branch untuk Staging
1. Di dashboard Neon, klik **"Branches"**
2. Klik **"Create Branch"**
3. Buat branch `development` untuk testing

---

## 4. Setup Lokal (Development)

### Langkah 1: Clone Repository
```bash
# Jika sudah ada repo:
git clone https://github.com/USERNAME/sipekan.git
cd sipekan

# ATAU mulai dari folder project yang sudah ada:
cd sipekan
```

### Langkah 2: Install Dependencies
```bash
npm install
# ATAU jika pakai bun:
bun install
```

### Langkah 3: Setup Environment Variables
```bash
# Copy file template
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Gunakan DATABASE_URL dari Neon (Langkah 2 di atas)
DATABASE_URL="postgresql://neondb_owner:xxxxx@ep-xxxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Setting aplikasi
NEXT_PUBLIC_APP_NAME="SIPEKAN"
NEXT_PUBLIC_APP_SUBTITLE="Sistem Informasi Pelayanan Besukan Lapas"
NEXT_PUBLIC_INSTITUTION_NAME="LAPAS KELAS IIA"
```

### Langkah 4: Generate Prisma & Push Schema ke Database
```bash
# Generate Prisma Client
npx prisma generate

# Push schema ke database (membuat tabel otomatis)
npx prisma db push

# Seed data awal (counters, settings)
npm run db:seed
# ATAU: bunx tsx prisma/seed.ts
```

**Output yang diharapkan:**
```
🌱 Seeding SIPEKAN database...
📍 Creating default counters...
  ✅ Loket 1 (besukan_tatap_muka)
  ✅ Loket 2 (besukan_tatap_muka)
  ✅ Loket 3 (penitipan_barang)
⚙️  Creating default settings...
  ✅ Nama Aplikasi
  ✅ Subtitle Aplikasi
  ...

✨ Seed completed successfully!
```

### Langkah 5: Jalankan Development Server
```bash
npm run dev
# ATAU: bun run dev
```

Buka browser: **http://localhost:3000**

---

## 5. Konfigurasi Environment Variables

### Variables Wajib:
| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://...` |

### Variables Opsional:
| Variable | Deskripsi | Default |
|----------|-----------|---------|
| `NEXT_PUBLIC_APP_NAME` | Nama aplikasi | SIPEKAN |
| `NEXT_PUBLIC_APP_SUBTITLE` | Subtitle | Sistem Informasi... |
| `NEXT_PUBLIC_INSTITUTION_NAME` | Nama instansi | LAPAS KELAS IIA |
| `GOOGLE_DRIVE_FOLDER_ID` | Folder ID Google Drive | - |
| `GOOGLE_DRIVE_CLIENT_EMAIL` | Service account email | - |
| `GOOGLE_DRIVE_PRIVATE_KEY` | Service account key | - |

---

## 6. Push ke GitHub

### Langkah 1: Inisialisasi Git (jika belum)
```bash
cd sipekan

# Inisialisasi git
git init
git add .
git commit -m "Initial commit: SIPEKAN backend"
```

### Langkah 2: Buat Repository di GitHub
1. Buka https://github.com/new
2. **Repository name**: `sipekan`
3. **Description**: `Sistem Informasi Pelayanan Besukan Lapas`
4. **Visibility**: Private (rekomendasi)
5. **JANGAN centang** "Initialize with README" (karena sudah ada code)
6. Klik **"Create repository"**

### Langkah 3: Push ke GitHub
```bash
# Tambahkan remote
git remote add origin https://github.com/USERNAME/sipekan.git

# Rename branch ke main
git branch -M main

# Push
git push -u origin main
```

### Langkah 4: Buat .gitignore
Pastikan file `.gitignore` sudah berisi:
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Next.js
.next/
out/

# Production
build/
dist/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
db/*.db
db/*.db-journal

# Logs
*.log
npm-debug.log*
dev.log
server.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

---

## 7. Deploy ke Vercel

### Langkah 1: Buat Akun Vercel
1. Buka https://vercel.com
2. Klik **"Sign Up"** → Login dengan **GitHub** (sangat direkomendasikan)

### Langkah 2: Import Repository
1. Di dashboard Vercel, klik **"Add New"** → **"Project"**
2. Anda akan melihat daftar repository GitHub
3. Cari dan klik **"Import"** pada repository `sipekan`
4. Jika tidak muncul, klik **"Adjust GitHub App Permissions"**

### Langkah 3: Konfigurasi Project
Pada halaman **"Configure Project"**:

#### Project Settings:
| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | `.` (default) |
| **Build Command** | `npx prisma generate && next build` |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` |

#### ⚠️ PENTING: Build Command
Di kolom **Build Command**, isi:
```
npx prisma generate && next build
```
Ini memastikan Prisma Client di-generate sebelum build.

### Langkah 4: Environment Variables di Vercel
Di bagian **"Environment Variables"**, tambahkan:

| Key | Value | Environments |
|-----|-------|-------------|
| `DATABASE_URL` | (paste dari Neon) | Production, Preview, Development |
| `NEXT_PUBLIC_APP_NAME` | `SIPEKAN` | Production |
| `NEXT_PUBLIC_APP_SUBTITLE` | `Sistem Informasi Pelayanan Besukan` | Production |
| `NEXT_PUBLIC_INSTITUTION_NAME` | `LAPAS KELAS IIA` | Production |

**Untuk menambahkan DATABASE_URL:**
1. Klik **"Add New"** di kolom Environment Variables
2. Key: `DATABASE_URL`
3. Value: Paste connection string dari Neon
4. Environments: Centang **Production**, **Preview**, dan **Development**
5. Klik **"Add"**

### Langkah 5: Deploy
1. Klik tombol **"Deploy"**
2. Tunggu proses build (±2-3 menit)
3. Jika berhasil, Anda akan melihat 🎉

### Langkah 6: Akses Aplikasi
Setelah deploy berhasil, Vercel memberikan URL:
```
https://sipekan-xxxx.vercel.app
```
atau jika Anda setup custom domain:
```
https://sipekan.lapas.go.id
```

---

## 8. Post-Deploy Setup

### Langkah 1: Jalankan Migrasi Database di Production
Setelah deploy pertama, pastikan schema sudah tersinkron:

**Opsi A: Otomatis via Vercel**
Build command sudah include `prisma generate`, tapi untuk push schema baru, tambahkan di build command:
```
npx prisma generate && npx prisma db push && next build
```

**Opsi B: Manual via Terminal**
```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://...production..."

# Push schema
npx prisma db push --accept-data-loss
```

### Langkah 2: Seed Data di Production
```bash
# Via Vercel CLI (install dulu: npm i -g vercel)
vercel env pull .env.production.local
npx tsx prisma/seed.ts
```

### Langkah 3: Setup Custom Domain (Opsional)
1. Di Vercel Dashboard → Project → **Settings** → **Domains**
2. Tambahkan domain Anda
3. Update DNS records di provider domain:
   ```
   Type: CNAME
   Name: sipekan (atau subdomain Anda)
   Value: cname.vercel-dns.com
   ```
4. Tunggu propagasi DNS (±15-30 menit)

### Langkah 4: Setup Google Drive Sync (Opsional)
1. Buka Google Cloud Console
2. Buat project baru atau pilih yang sudah ada
3. **Enable APIs** → aktifkan **Google Drive API**
4. **IAM & Admin** → **Service Accounts** → **Create Service Account**
5. Buat JSON key dan download
6. Di Vercel, tambahkan environment variables:
   - `GOOGLE_DRIVE_FOLDER_ID`
   - `GOOGLE_DRIVE_CLIENT_EMAIL`
   - `GOOGLE_DRIVE_PRIVATE_KEY`
7. Re-deploy: `vercel --prod`

---

## 9. API Documentation

### Base URL: `https://sipekan-xxx.vercel.app/api`

### 🔢 Antrian (Queue)

#### Ambil Nomor Antrian
```bash
POST /api/antrian
Content-Type: application/json

{
  "serviceType": "besukan_tatap_muka"
  // atau: "penitipan_barang"
}

# Response 201:
{
  "nomorAntrian": "B-0001",
  "serviceLabel": "Besukan Tatap Muka",
  "estimasi": {
    "antrianSebelum": 0,
    "estimasiWaktu": "0 menit"
  }
}
```

#### Lihat Status Antrian
```bash
GET /api/antrian
GET /api/antrian?date=2025-01-15
GET /api/antrian?service=besukan_tatap_muka

# Response:
{
  "date": "2025-01-15",
  "stats": {
    "menunggu": 5,
    "dipanggil": 1,
    "dilayani": 0,
    "selesai": 10,
    "total": 16
  },
  "services": [...],
  "counters": [...]
}
```

#### Reset Antrian Harian
```bash
DELETE /api/antrian?confirm=RESET
DELETE /api/antrian?confirm=RESET&service=besukan_tatap_muka
```

### 🏢 Counter/Loket

#### Lihat Semua Loket
```bash
GET /api/counter
GET /api/counter?active=true
```

#### Buat Loket Baru
```bash
POST /api/counter
Content-Type: application/json

{
  "name": "Loket 4",
  "serviceType": "penitipan_barang",
  "order": 4
}
```

#### Update Loket
```bash
PUT /api/counter
Content-Type: application/json

{
  "id": "counter-id",
  "isActive": true,
  "isOnline": true
}
```

### 📢 Panggil Antrian

#### Panggil Nomor Berikutnya
```bash
POST /api/panggil
Content-Type: application/json

{
  "counterId": "loket-1-id"
}

# Response:
{
  "message": "Nomor B-0005 dipanggil ke Loket 1",
  "queue": { "nomorAntrian": "B-0005", ... },
  "called": true
}
```

### 📝 Pendaftaran (Registration)

#### Buat Pendaftaran Baru
```bash
POST /api/pendaftaran
Content-Type: application/json

{
  "namaLengkap": "Ahmad Fauzi",
  "nik": "3201234567890001",
  "tanggalBesukan": "2025-01-20",
  "namaWargaBinaan": "Budi Santoso",
  "hubungan": "Istri",
  "tujuan": "Besukan Tatap Muka",
  "jumlahPengunjung": "2",
  ...
}
```

#### Lihat Semua Pendaftaran
```bash
GET /api/pendaftaran
GET /api/pendaftaran?status=menunggu
GET /api/pendaftaran?search=Ahmad
```

#### Update Status Pendaftaran
```bash
PUT /api/pendaftaran/[id]
Content-Type: application/json

{
  "status": "diverifikasi",
  "catatanPetugas": "Dokumen lengkap",
  "petugasVerifikator": "Petugas A"
}
```

### ⚙️ Settings

#### Ambil Semua Pengaturan
```bash
GET /api/settings
GET /api/settings?key=media_playlist
```

#### Update Pengaturan
```bash
POST /api/settings
Content-Type: application/json

{
  "key": "media_playlist",
  "value": [
    { "type": "youtube", "id": "VIDEO_ID", "title": "Video Info" }
  ]
}
```

#### Batch Update
```bash
PUT /api/settings
Content-Type: application/json

{
  "settings": {
    "media_playlist": [...],
    "display_settings": { "volume": 80 }
  }
}
```

### 🔊 TTS (Text-to-Speech)

```bash
GET /api/tts?text=Nomor B 0042 silakan ke Loket 1

# Response: Audio stream (MP3)
```

### ❤️ Health Check

```bash
GET /api/health

# Response:
{
  "status": "ok",
  "service": "SIPEKAN",
  "version": "1.0.0"
}
```

---

## 10. Troubleshooting

### ❌ Build Gagal di Vercel

**Error: `prisma generate` failed**
```
Solusi: Pastikan Build Command = "npx prisma generate && next build"
```

**Error: `DATABASE_URL` not found**
```
Solusi: Tambahkan DATABASE_URL di Vercel Environment Variables
```

### ❌ Database Connection Error

**Error: `P1001: Can't reach database server`**
```
Solusi: 
1. Cek DATABASE_URL benar
2. Pastikan sslmode=require ada di connection string
3. Cek firewall Neon (default: allow all)
```

### ❌ Tabel Tidak Ada

**Error: `Table not found`**
```
Solusi: 
1. Tambahkan "npx prisma db push" di build command
2. ATAU jalankan manual: vercel env pull && npx prisma db push
```

### ❌ API Returns 500

**Solusi: Cek Vercel Function Logs**
1. Dashboard → Project → **Logs**
2. Filter by function name
3. Lihat error details

### ❌ index.html Tidak Terbuka

**Solusi: Pastikan `public/index.html` ada dan page.tsx merujuk ke sana**
```
# Di page.tsx:
<iframe src="/index.html" ... />
```

### 📞 Resource

| Resource | URL |
|----------|-----|
| Vercel Docs | https://vercel.com/docs |
| Neon Docs | https://neon.tech/docs |
| Prisma Docs | https://www.prisma.io/docs |
| Next.js Docs | https://nextjs.org/docs |

---

## 📝 Checklist Deploy

- [ ] Database Neon dibuat
- [ ] DATABASE_URL dicopy
- [ ] `.env.local` dikonfigurasi
- [ ] `prisma generate` berhasil
- [ ] `prisma db push` berhasil
- [ ] `npm run db:seed` berhasil
- [ ] `npm run dev` berjalan lokal
- [ ] Push ke GitHub
- [ ] Import di Vercel
- [ ] Environment Variables diisi di Vercel
- [ ] Build Command: `npx prisma generate && next build`
- [ ] Deploy berhasil
- [ ] Aplikasi bisa diakses
- [ ] API health check OK
- [ ] Seed data production (opsional)

---

**© 2025 SIPEKAN - Sistem Informasi Pelayanan Besukan Lapas**
