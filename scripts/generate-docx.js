const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  TableRow, TableCell, Table, WidthType, BorderStyle, Footer, PageNumber,
  ShadingType, TabStopPosition, TabStopType, LineRuleType,
  TableBorders, convertInchesToTwip, convertMillimetersToTwip, PageBreak
} = require("docx");
const fs = require("fs");
const path = require("path");

// ─── Color Palette ───────────────────────────────────────────────────
const PRIMARY    = "1A5276"; // Dark blue
const ACCENT     = "2E86C1"; // Medium blue
const DARK       = "1B2631";
const GRAY       = "5D6D7E";
const LIGHT_BG   = "EBF5FB";
const WHITE      = "FFFFFF";
const BLACK      = "000000";
const CODE_BG    = "F2F3F4";
const CODE_TEXT  = "1B2631";

// ─── Border Helpers ──────────────────────────────────────────────────
const NO_BORDER  = { style: BorderStyle.NONE, size: 0, color: WHITE };
const CELL_BORDER = { style: BorderStyle.SINGLE, size: 1, color: "BDC3C7" };
const ALL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

// ─── Reusable Styles ────────────────────────────────────────────────
const FONT_BODY     = "Calibri";
const FONT_HEADING  = "Calibri";
const FONT_CODE     = "Consolas";

function spacing(before = 0, after = 120) {
  return { before, after, line: 312, lineRule: LineRuleType.AUTO };
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: spacing(360, 200),
    children: [
      new TextRun({
        text,
        font: FONT_HEADING,
        size: 32,
        bold: true,
        color: PRIMARY,
      }),
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: ACCENT, space: 4 },
    },
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: spacing(280, 140),
    children: [
      new TextRun({
        text,
        font: FONT_HEADING,
        size: 26,
        bold: true,
        color: ACCENT,
      }),
    ],
  });
}

function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: spacing(0, 80),
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        font: FONT_BODY,
        size: 22,
        color: opts.color || DARK,
        bold: opts.bold || false,
      }),
    ],
  });
}

function bulletItem(text, level = 0) {
  const indent = 720 + level * 360;
  return new Paragraph({
    spacing: spacing(0, 40),
    bullet: { level },
    indent: { left: indent, hanging: 360 },
    children: [
      new TextRun({
        text,
        font: FONT_BODY,
        size: 22,
        color: DARK,
      }),
    ],
  });
}

function richBullet(runs, level = 0) {
  const indent = 720 + level * 360;
  return new Paragraph({
    spacing: spacing(0, 40),
    bullet: { level },
    indent: { left: indent, hanging: 360 },
    children: runs.map(r => new TextRun({
      text: r.text,
      font: r.font || FONT_BODY,
      size: 22,
      color: r.color || DARK,
      bold: r.bold || false,
    })),
  });
}

function codeBlock(lines) {
  const result = [];
  // Add a small spacer before code block
  result.push(new Paragraph({ spacing: spacing(60, 0), children: [] }));
  for (const line of lines) {
    result.push(
      new Paragraph({
        spacing: spacing(0, 0),
        indent: { left: 360 },
        shading: { type: ShadingType.SOLID, color: CODE_BG },
        children: [
          new TextRun({
            text: line || " ",
            font: FONT_CODE,
            size: 19,
            color: CODE_TEXT,
          }),
        ],
      })
    );
  }
  // Spacer after
  result.push(new Paragraph({ spacing: spacing(60, 0), children: [] }));
  return result;
}

function numberedItem(num, text) {
  return new Paragraph({
    spacing: spacing(0, 60),
    indent: { left: 720, hanging: 360 },
    children: [
      new TextRun({ text: `${num}. `, font: FONT_BODY, size: 22, bold: true, color: PRIMARY }),
      new TextRun({ text, font: FONT_BODY, size: 22, color: DARK }),
    ],
  });
}

function noteBox(label, text) {
  return new Paragraph({
    spacing: spacing(100, 100),
    indent: { left: 360, right: 360 },
    shading: { type: ShadingType.SOLID, color: LIGHT_BG },
    children: [
      new TextRun({ text: `${label}: `, font: FONT_BODY, size: 22, bold: true, color: PRIMARY }),
      new TextRun({ text, font: FONT_BODY, size: 22, color: DARK }),
    ],
  });
}

function pageBreak() {
  return new Paragraph({
    children: [new PageBreak()],
    spacing: { after: 0 },
  });
}

// ─── Table Helpers ───────────────────────────────────────────────────
function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DIXELS },
    shading: { type: ShadingType.SOLID, color: PRIMARY },
    borders: ALL_BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: spacing(40, 40),
        children: [new TextRun({ text, font: FONT_BODY, size: 20, bold: true, color: WHITE })],
      }),
    ],
  });
}

function dataCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DIXELS },
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
    borders: ALL_BORDERS,
    children: [
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: spacing(40, 40),
        children: [
          new TextRun({
            text,
            font: opts.font || FONT_BODY,
            size: opts.size || 20,
            color: opts.color || DARK,
            bold: opts.bold || false,
          }),
        ],
      }),
    ],
  });
}

function codeCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DIXELS },
    borders: ALL_BORDERS,
    shading: { type: ShadingType.SOLID, color: CODE_BG },
    children: [
      new Paragraph({
        spacing: spacing(40, 40),
        indent: { left: 120 },
        children: [new TextRun({ text, font: FONT_CODE, size: 19, color: CODE_TEXT })],
      }),
    ],
  });
}

// ═════════════════════════════════════════════════════════════════════
// DOCUMENT CONSTRUCTION
// ═════════════════════════════════════════════════════════════════════

const children = [];

// ─── Title Block ─────────────────────────────────────────────────────
children.push(
  new Paragraph({ spacing: spacing(1200, 0), children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: spacing(0, 100),
    children: [
      new TextRun({ text: "PANDUAN INSTALASI & DEPLOY", font: FONT_HEADING, size: 40, bold: true, color: PRIMARY }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: spacing(0, 60),
    children: [
      new TextRun({ text: "SIPEKAN", font: FONT_HEADING, size: 52, bold: true, color: ACCENT }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: spacing(0, 200),
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 3, color: ACCENT, space: 8 },
    },
    children: [
      new TextRun({ text: "Sistem Informasi Pelayanan Besukan Lapas", font: FONT_BODY, size: 24, color: GRAY }),
    ],
  }),
  new Paragraph({ spacing: spacing(200, 0), children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: spacing(0, 60),
    children: [
      new TextRun({ text: "Disusun oleh:", font: FONT_BODY, size: 22, color: GRAY }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: spacing(0, 60),
    children: [
      new TextRun({ text: "Tim IT Lapas", font: FONT_BODY, size: 24, bold: true, color: PRIMARY }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: spacing(0, 200),
    children: [
      new TextRun({ text: `Versi 1.0 — ${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long" })}`, font: FONT_BODY, size: 20, color: GRAY }),
    ],
  }),
);

// ─── 1. Pendahuluan ─────────────────────────────────────────────────
children.push(heading1("1. Pendahuluan"));
children.push(bodyText(
  "SIPEKAN (Sistem Informasi Pelayanan Besukan Lapas) adalah aplikasi berbasis web yang dirancang untuk mengelola pelayanan besukan (kunjungan) di Lembaga Pemasyarakatan. Sistem ini bertujuan untuk meningkatkan efisiensi, transparansi, dan akuntabilitas dalam proses pelayanan kunjungan warga binaan."
));
children.push(bodyText(
  "Aplikasi ini dikembangkan menggunakan teknologi modern yang memastikan performa tinggi, keamanan data, serta kemudahan dalam pengelolaan dan pemeliharaan sistem."
));

children.push(heading2("1.1 Tech Stack"));
children.push(bulletItem("Next.js 16 — Framework React full-stack dengan App Router"));
children.push(bulletItem("TypeScript — Bahasa pemrograman dengan tipe data statis"));
children.push(bulletItem("Prisma ORM — Object-Relational Mapping untuk akses database"));
children.push(bulletItem("SQLite / Turso (LibSQL) — Database ringan dan reliable"));
children.push(bulletItem("Tailwind CSS — Utility-first CSS framework untuk styling"));
children.push(bulletItem("shadcn/ui — Komponen UI modern dan aksesibel"));

children.push(heading2("1.2 Fitur Utama"));
children.push(richBullet([{ text: "Pendaftaran Pengunjung Online — ", bold: true }, { text: "Pengunjung dapat mendaftar secara daring sebelum datang ke lapas, mengurangi waktu antri." }]));
children.push(richBullet([{ text: "Verifikasi Petugas — ", bold: true }, { text: "Petugas memverifikasi data pengunjung sebelum memberikan izin masuk." }]));
children.push(richBullet([{ text: "Antrian Digital — ", bold: true }, { text: "Sistem antrian otomatis dengan nomor urut dan estimasi waktu tunggu." }]));
children.push(richBullet([{ text: "Cetak Surat Izin Besukan — ", bold: true }, { text: "Pencetakan surat izin besukan secara otomatis setelah verifikasi." }]));
children.push(richBullet([{ text: "Notifikasi WhatsApp — ", bold: true }, { text: "Pengirim notifikasi otomatis ke pengunjung melalui WhatsApp." }]));
children.push(richBullet([{ text: "Rekapitulasi Harian — ", bold: true }, { text: "Laporan harian lengkap tentang kunjungan, antrian, dan aktivitas pelayanan." }]));

// ─── 2. Persyaratan Sistem ──────────────────────────────────────────
children.push(heading1("2. Persyaratan Sistem"));
children.push(bodyText("Sebelum melakukan instalasi, pastikan sistem memenuhi persyaratan berikut:"));

const reqWidths = [3200, 5200];
children.push(
  new Table({
    width: { size: 8400, type: WidthType.DIXELS },
    rows: [
      new TableRow({ children: [headerCell("Komponen", reqWidths[0]), headerCell("Persyaratan", reqWidths[1])] }),
      new TableRow({ children: [dataCell("Node.js", reqWidths[0], { bold: true }), dataCell("Versi 18 atau lebih baru (disarankan LTS)", reqWidths[1])] }),
      new TableRow({ children: [dataCell("Package Manager", reqWidths[0], { bold: true, shading: LIGHT_BG }), dataCell("npm (bundled dengan Node.js) atau bun", reqWidths[1], { shading: LIGHT_BG })] }),
      new TableRow({ children: [dataCell("Git", reqWidths[0], { bold: true }), dataCell("Versi 2.x untuk clone dan version control", reqWidths[1])] }),
      new TableRow({ children: [dataCell("Browser", reqWidths[0], { bold: true, shading: LIGHT_BG }), dataCell("Google Chrome, Microsoft Edge, atau Mozilla Firefox (versi terbaru)", reqWidths[1], { shading: LIGHT_BG })] }),
      new TableRow({ children: [dataCell("Sistem Operasi", reqWidths[0], { bold: true }), dataCell("Windows 10+, macOS 12+, atau Linux (Ubuntu 20+/Debian 11+)", reqWidths[1])] }),
      new TableRow({ children: [dataCell("RAM", reqWidths[0], { bold: true, shading: LIGHT_BG }), dataCell("Minimal 4 GB (disarankan 8 GB)", reqWidths[1], { shading: LIGHT_BG })] }),
      new TableRow({ children: [dataCell("Disk Space", reqWidths[0], { bold: true }), dataCell("Minimal 2 GB ruang kosong", reqWidths[1])] }),
    ],
  })
);

children.push(noteBox("Catatan", "Untuk deploy ke Vercel, diperlukan akun GitHub dan Vercel (gratis)."));

// ─── 3. Instalasi Local Development ──────────────────────────────────
children.push(heading1("3. Instalasi Local Development"));
children.push(bodyText("Berikut adalah langkah-langkah untuk menginstal dan menjalankan SIPEKAN di lingkungan pengembangan lokal."));

children.push(heading2("3.1 Clone Repository"));
children.push(bodyText("Clone repositori SIPEKAN dari GitHub ke komputer lokal:"));
children.push(...codeBlock([
  "git clone https://github.com/USERNAME/sipekan.git",
  "cd sipekan",
]));

children.push(heading2("3.2 Install Dependencies"));
children.push(bodyText("Install semua dependensi yang diperlukan oleh aplikasi:"));
children.push(...codeBlock(["npm install"]));
children.push(noteBox("Alternatif", "Jika menggunakan bun, jalankan: bun install"));

children.push(heading2("3.3 Setup Environment"));
children.push(bodyText("Buat file konfigurasi environment dari template yang tersedia:"));
children.push(...codeBlock(["cp .env.example .env"]));
children.push(bodyText("Buka file .env dan sesuaikan konfigurasi database:"));
children.push(...codeBlock([
  'DATABASE_URL="file:./db/custom.db"',
  "",
  "# Konfigurasi WhatsApp (opsional)",
  '# WHATSAPP_PROVIDER="fonnte"',
  '# WHATSAPP_API_KEY="your-api-key"',
  '# WHATSAPP_DEVICE="your-device-id"',
]));

children.push(heading2("3.4 Setup Database"));
children.push(bodyText("Inisialisasi database dan seed data awal:"));
children.push(...codeBlock([
  "npx prisma db push",
  "npx prisma db seed",
]));
children.push(bodyText("Perintah di atas akan:"));
children.push(bulletItem("Membuat struktur tabel sesuai schema Prisma"));
children.push(bulletItem("Memasukkan data awal (akun default, layanan, dan pengaturan sistem)"));

children.push(heading2("3.5 Jalankan Server"));
children.push(bodyText("Jalankan server development:"));
children.push(...codeBlock(["npm run dev"]));
children.push(bodyText("Buka browser dan akses alamat berikut:"));
children.push(...codeBlock(["http://localhost:3000"]));
children.push(noteBox("Port", "Jika port 3000 sudah digunakan, Next.js akan otomatis menggunakan port berikutnya (3001, 3002, dst). Perhatikan pesan di terminal."));

// ─── 4. Akun Default ────────────────────────────────────────────────
children.push(heading1("4. Akun Default"));
children.push(bodyText("Sistem SIPEKAN menyediakan akun default untuk memulai penggunaan. Ganti password setelah login pertama kali."));

const accWidths = [1600, 1600, 2000, 3200];
children.push(
  new Table({
    width: { size: 8400, type: WidthType.DIXELS },
    rows: [
      new TableRow({ children: [headerCell("Username", accWidths[0]), headerCell("Password", accWidths[1]), headerCell("Nama", accWidths[2]), headerCell("Jabatan", accWidths[3])] }),
      new TableRow({ children: [
        dataCell("admin", accWidths[0], { font: FONT_CODE, bold: true }),
        dataCell("admin123", accWidths[1], { font: FONT_CODE }),
        dataCell("Budi Santoso", accWidths[2]),
        dataCell("Kepala Seksi Pelayanan", accWidths[3]),
      ]}),
      new TableRow({ children: [
        dataCell("petugas1", accWidths[0], { font: FONT_CODE, bold: true, shading: LIGHT_BG }),
        dataCell("petugas123", accWidths[1], { font: FONT_CODE, shading: LIGHT_BG }),
        dataCell("Siti Rahayu", accWidths[2], { shading: LIGHT_BG }),
        dataCell("Petugas Pendaftaran", accWidths[3], { shading: LIGHT_BG }),
      ]}),
    ],
  })
);
children.push(noteBox("Keamanan", "Segera ubah password akun default setelah instalasi. Gunakan password yang kuat dengan kombinasi huruf besar, huruf kecil, angka, dan simbol."));

// ─── 5. Deploy ke Vercel ────────────────────────────────────────────
children.push(pageBreak());
children.push(heading1("5. Deploy ke Vercel"));
children.push(bodyText("Vercel adalah platform hosting yang direkomendasikan untuk mendeploy aplikasi Next.js. Berikut langkah-langkah deploy SIPEKAN ke Vercel dengan database Turso."));

children.push(heading2("5.1 Buat Database Turso (Gratis)"));
children.push(bodyText("Turso menyediakan database SQLite di cloud secara gratis. Install CLI Turso dan buat database:"));
children.push(...codeBlock([
  "# Install Turso CLI",
  "curl -sSfL https://get.tur.so/install.sh | bash",
  "",
  "# Login ke Turso",
  "turso auth login",
  "",
  "# Buat database baru",
  "turso db create sipekan-db",
  "",
  "# Buat authentication token",
  "turso db tokens create sipekan-db",
]));

children.push(noteBox("Token", "Simpan token yang dihasilkan dengan baik. Token ini dibutuhkan untuk koneksi database dari Vercel."));

children.push(heading2("5.2 Push Schema ke Turso"));
children.push(bodyText("Setelah database Turso dibuat, push schema dan seed data:"));
children.push(...codeBlock([
  "# Set environment variable database URL",
  'export DATABASE_URL="libsql://sipekan-db-your-org.turso.io?authToken=YOUR_TOKEN"',
  "",
  "# Push schema ke Turso",
  "npx prisma db push",
  "",
  "# Seed data awal",
  "npx prisma db seed",
]));

children.push(heading2("5.3 Push ke GitHub"));
children.push(bodyText("Upload kode sumber ke repository GitHub:"));
children.push(...codeBlock([
  "# Inisialisasi git (jika belum)",
  "git init",
  "git add .",
  'git commit -m "SIPEKAN ready for deployment"',
  "",
  "# Tambahkan remote dan push",
  "git remote add origin https://github.com/USERNAME/sipekan.git",
  "git branch -M main",
  "git push -u origin main",
]));

children.push(heading2("5.4 Deploy di Vercel"));
children.push(bodyText("Lakukan langkah-langkah berikut di dashboard Vercel:"));
children.push(numberedItem(1, "Buka https://vercel.com dan login menggunakan akun GitHub."));
children.push(numberedItem(2, "Klik tombol \"Add New\" \u2192 \"Project\"."));
children.push(numberedItem(3, "Pilih repository \"sipekan\" dari daftar GitHub."));
children.push(numberedItem(4, "Pada bagian \"Environment Variables\", tambahkan:"));
children.push(...codeBlock([
  'DATABASE_URL = "libsql://sipekan-db-your-org.turso.io?authToken=YOUR_TOKEN"',
]));
children.push(numberedItem(5, "Klik tombol \"Deploy\" dan tunggu proses build selesai."));
children.push(noteBox("Selesai", "Setelah deploy berhasil, aplikasi dapat diakses melalui URL yang diberikan Vercel (misal: https://sipekan.vercel.app)."));

// ─── 6. Struktur Database ───────────────────────────────────────────
children.push(heading1("6. Struktur Database"));
children.push(bodyText("Berikut adalah tabel-tabel utama dalam database SIPEKAN beserta deskripsinya:"));

const dbWidths = [2600, 5800];
const dbTables = [
  ["Petugas", "Data petugas lapas termasuk nama, username, password (hashed), jabatan, dan status aktif."],
  ["Layanan", "Jenis layanan besukan yang tersedia (Besukan Umum, Besukan Khusus, dll)."],
  ["Counter", "Data loket pelayanan aktif beserta petugas yang bertugas."],
  ["Registration", "Data pendaftaran pengunjung termasuk identitas, hubungan dengan warga binaan, dan status."],
  ["Verification", "Data verifikasi petugas terhadap pendaftaran pengunjung."],
  ["QueueTicket", "Nomor tiket antrian yang diterbitkan setelah verifikasi berhasil."],
  ["QueueCall", "Riwayat pemanggilan antrian oleh petugas di counter."],
  ["DailySession", "Sesi pelayanan harian termasuk status buka/tutup dan kuota."],
  ["Notifikasi", "Log notifikasi yang dikirimkan ke pengunjung melalui WhatsApp."],
  ["Pengaturan", "Konfigurasi sistem termasuk nama lapas, jam operasional, dan pengaturan WhatsApp."],
];
const dbRows = [
  new TableRow({ children: [headerCell("Tabel", dbWidths[0]), headerCell("Deskripsi", dbWidths[1])] }),
  ...dbTables.map((t, i) => new TableRow({
    children: [
      dataCell(t[0], dbWidths[0], { bold: true, font: FONT_CODE, shading: i % 2 === 0 ? undefined : LIGHT_BG }),
      dataCell(t[1], dbWidths[1], { shading: i % 2 === 0 ? undefined : LIGHT_BG }),
    ],
  })),
];
children.push(new Table({ width: { size: 8400, type: WidthType.DIXELS }, rows: dbRows }));

children.push(bodyText("Relasi antar tabel dirancang untuk menjaga integritas data. Schema lengkap dapat dilihat pada file prisma/schema.prisma."));

// ─── 7. API Endpoints ───────────────────────────────────────────────
children.push(pageBreak());
children.push(heading1("7. API Endpoints"));
children.push(bodyText("Berikut adalah daftar lengkap API endpoints yang tersedia dalam sistem SIPEKAN:"));

children.push(heading2("7.1 Autentikasi"));
const authEp = [
  ["/api/auth/login", "POST", "Login petugas dengan username dan password"],
  ["/api/auth/logout", "POST", "Logout dan hapus session"],
  ["/api/auth/me", "GET", "Ambil data petugas yang sedang login"],
];
children.push(apiTable(authEp));

children.push(heading2("7.2 Pendaftaran Pengunjung"));
const regEp = [
  ["/api/pendaftaran", "GET", "Ambil daftar semua pendaftaran"],
  ["/api/pendaftaran", "POST", "Buat pendaftaran pengunjung baru"],
  ["/api/pendaftaran/[id]", "GET", "Ambil detail pendaftaran berdasarkan ID"],
  ["/api/pendaftaran/[id]", "DELETE", "Hapus pendaftaran"],
  ["/api/pendaftaran/[id]/verify", "POST", "Verifikasi pendaftaran oleh petugas"],
];
children.push(apiTable(regEp));

children.push(heading2("7.3 Antrian"));
const queueEp = [
  ["/api/antrian", "GET", "Ambil daftar antrian aktif"],
  ["/api/antrian/[nomor]", "GET", "Ambil detail tiket antrian berdasarkan nomor"],
];
children.push(apiTable(queueEp));

children.push(heading2("7.4 Counter / Loket"));
const counterEp = [
  ["/api/counter", "GET", "Ambil daftar semua counter"],
  ["/api/counter/[id]/call", "POST", "Panggil nomor antrian berikutnya"],
  ["/api/counter/[id]/recall", "POST", "Panggil ulang nomor antrian terakhir"],
];
children.push(apiTable(counterEp));

children.push(heading2("7.5 Layanan & Pengaturan"));
const serviceEp = [
  ["/api/layanan", "GET", "Ambil daftar jenis layanan"],
  ["/api/pengaturan", "GET", "Ambil konfigurasi sistem"],
  ["/api/pengaturan", "PUT", "Update konfigurasi sistem"],
];
children.push(apiTable(serviceEp));

children.push(heading2("7.6 Laporan & Utilitas"));
const utilEp = [
  ["/api/rekapitulasi", "GET", "Ambil rekapitulasi harian kunjungan"],
  ["/api/surat-izin", "POST", "Generate surat izin besukan"],
  ["/api/display", "GET", "Data untuk layar display antrian"],
  ["/api/tts", "POST", "Konversi teks ke suara untuk pengumuman"],
  ["/api/seed", "POST", "Reset dan seed ulang database"],
];
children.push(apiTable(utilEp));

// ─── 8. Konfigurasi WhatsApp ────────────────────────────────────────
children.push(heading1("8. Konfigurasi WhatsApp"));
children.push(bodyText("SIPEKAN mendukung pengiriman notifikasi otomatis ke pengunjung melalui WhatsApp. Fitur ini menggunakan layanan pihak ketiga sebagai pengirim pesan."));

children.push(heading2("8.1 Provider yang Didukung"));
children.push(bulletItem("Fonnte (https://fonnte.com) — Layanan WhatsApp API berbayar dengan fitur lengkap."));
children.push(bulletItem("Wablas (https://wablas.com) — Alternatif provider WhatsApp API."));

children.push(heading2("8.2 Langkah Konfigurasi"));
children.push(numberedItem(1, "Daftar akun di salah satu provider WhatsApp API yang didukung."));
children.push(numberedItem(2, "Dapatkan API Key dan Device ID dari dashboard provider."));
children.push(numberedItem(3, "Login ke aplikasi SIPEKAN sebagai admin."));
children.push(numberedItem(4, "Buka menu Pengaturan \u2192 Konfigurasi WhatsApp."));
children.push(numberedItem(5, "Masukkan API Key, Device ID, dan pilih provider."));
children.push(numberedItem(6, "Klik \"Simpan\" dan lakukan test pengiriman notifikasi."));

children.push(heading2("8.3 Variabel Environment (Opsional)"));
children.push(...codeBlock([
  'WHATSAPP_PROVIDER="fonnte"',
  'WHATSAPP_API_KEY="your-api-key-here"',
  'WHATSAPP_DEVICE="your-device-id"',
]));

// ─── 9. Troubleshooting ─────────────────────────────────────────────
children.push(heading1("9. Troubleshooting"));
children.push(bodyText("Berikut adalah masalah-masalah umum yang mungkin ditemui beserta solusinya:"));

children.push(heading2("9.1 Error Saat Install Dependencies"));
children.push(richBullet([{ text: "Masalah: ", bold: true, color: "C0392B" }, { text: "npm install gagal atau error ERESOLVE" }]));
children.push(richBullet([{ text: "Solusi: ", bold: true, color: PRIMARY }, { text: "Hapus node_modules dan lock file, lalu install ulang:" }]));
children.push(...codeBlock(["rm -rf node_modules package-lock.json", "npm install"]));

children.push(heading2("9.2 Error Database Connection"));
children.push(richBullet([{ text: "Masalah: ", bold: true, color: "C0392B" }, { text: "Error \"Unable to open database file\" atau koneksi Turso gagal" }]));
children.push(richBullet([{ text: "Solusi: ", bold: true, color: PRIMARY }, { text: "Pastikan DATABASE_URL di file .env sudah benar. Untuk lokal, pastikan folder db/ sudah ada." }]));
children.push(...codeBlock(["mkdir -p prisma/db", "npx prisma db push"]));

children.push(heading2("9.3 Port 3000 Sudah Digunakan"));
children.push(richBullet([{ text: "Masalah: ", bold: true, color: "C0392B" }, { text: "Port 3000 sudah digunakan oleh aplikasi lain" }]));
children.push(richBullet([{ text: "Solusi: ", bold: true, color: PRIMARY }, { text: "Kill proses yang menggunakan port 3000 atau gunakan port lain:" }]));
children.push(...codeBlock([
  "# Kill proses di port 3000",
  "npx kill-port 3000",
  "",
  "# Atau jalankan di port tertentu",
  "PORT=3001 npm run dev",
]));

children.push(heading2("9.4 Build Error di Vercel"));
children.push(richBullet([{ text: "Masalah: ", bold: true, color: "C0392B" }, { text: "Deploy ke Vercel gagal dengan build error" }]));
children.push(richBullet([{ text: "Solusi: ", bold: true, color: PRIMARY }, { text: "Pastikan semua environment variable sudah dikonfigurasi di Vercel dashboard, termasuk DATABASE_URL." }]));
children.push(bulletItem("Periksa log build di Vercel untuk detail error."));
children.push(bulletItem("Pastikan Prisma client sudah di-generate saat build (tambahkan script postinstall)."));

children.push(heading2("9.5 WhatsApp Notifikasi Tidak Terkirim"));
children.push(richBullet([{ text: "Masalah: ", bold: true, color: "C0392B" }, { text: "Notifikasi WhatsApp tidak terkirim ke pengunjung" }]));
children.push(richBullet([{ text: "Solusi: ", bold: true, color: PRIMARY }, { text: "Periksa konfigurasi WhatsApp di menu Pengaturan:" }]));
children.push(bulletItem("Pastikan API Key dan Device ID masih valid."));
children.push(bulletItem("Pastikan saldo/kredit provider WhatsApp masih mencukupi."));
children.push(bulletItem("Periksa log notifikasi di menu Rekapitulasi."));

children.push(heading2("9.6 Halaman Tidak Ditemukan (404)"));
children.push(richBullet([{ text: "Masalah: ", bold: true, color: "C0392B" }, { text: "Beberapa halaman menampilkan error 404 setelah deploy" }]));
children.push(richBullet([{ text: "Solusi: ", bold: true, color: PRIMARY }, { text: "Bersihkan cache build dan redeploy:" }]));
children.push(bulletItem("Buka Vercel dashboard \u2192 Deployments \u2192 Redeploy."));
children.push(bulletItem("Pastikan tidak ada file konflik di folder app/."));

// ─── Footer ─────────────────────────────────────────────────────────
children.push(new Paragraph({ spacing: spacing(600, 0), children: [] }));
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: spacing(0, 0),
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: "BDC3C7", space: 8 } },
    children: [
      new TextRun({ text: "Dokumen ini bersifat rahasia dan hanya untuk penggunaan internal Lapas.", font: FONT_BODY, size: 18, color: GRAY, italics: true }),
    ],
  })
);

// ─── API Table Helper ───────────────────────────────────────────────
function apiTable(rows) {
  const w = [3200, 900, 4300];
  const tableRows = [
    new TableRow({ children: [headerCell("Endpoint", w[0]), headerCell("Method", w[1]), headerCell("Deskripsi", w[2])] }),
    ...rows.map((r, i) => new TableRow({
      children: [
        codeCell(r[0], w[0]),
        dataCell(r[1], w[1], { center: true, bold: true, font: FONT_CODE, shading: i % 2 === 0 ? undefined : LIGHT_BG }),
        dataCell(r[2], w[2], { shading: i % 2 === 0 ? undefined : LIGHT_BG }),
      ],
    })),
  ];
  children.push(new Table({ width: { size: 8400, type: WidthType.DIXELS }, rows: tableRows }));
  children.push(new Paragraph({ spacing: spacing(80, 0), children: [] }));
}

// ═════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═════════════════════════════════════════════════════════════════════

const doc = new Document({
  creator: "Tim IT Lapas",
  title: "PANDUAN INSTALASI & DEPLOY SIPEKAN",
  description: "Panduan lengkap instalasi dan deployment SIPEKAN (Sistem Informasi Pelayanan Besukan Lapas)",
  styles: {
    default: {
      document: {
        run: { font: FONT_BODY, size: 22 },
        paragraph: { spacing: { line: 312, lineRule: LineRuleType.AUTO } },
      },
      heading1: {
        run: { font: FONT_HEADING, size: 32, bold: true, color: PRIMARY },
        paragraph: { spacing: { before: 360, after: 200 } },
      },
      heading2: {
        run: { font: FONT_HEADING, size: 26, bold: true, color: ACCENT },
        paragraph: { spacing: { before: 280, after: 140 } },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: {
            width: convertMillimetersToTwip(210),   // A4
            height: convertMillimetersToTwip(297),
          },
          margin: {
            top: convertMillimetersToTwip(25),
            right: convertMillimetersToTwip(25),
            bottom: convertMillimetersToTwip(25),
            left: convertMillimetersToTwip(25),
          },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: "BDC3C7", space: 4 } },
              children: [
                new TextRun({ text: "PANDUAN DEPLOY SIPEKAN  —  ", font: FONT_BODY, size: 16, color: GRAY }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT_BODY, size: 16, color: GRAY }),
                new TextRun({ text: "  —  ", font: FONT_BODY, size: 16, color: GRAY }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT_BODY, size: 16, color: GRAY }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

// ─── Write File ──────────────────────────────────────────────────────
const OUTPUT_DIR = path.join(__dirname, "..", "public");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "PANDUAN-DEPLOY-SIPEKAN.docx");

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUTPUT_PATH, buffer);
  const stats = fs.statSync(OUTPUT_PATH);
  const sizeKB = (stats.size / 1024).toFixed(1);
  console.log(`\u2705 Document generated successfully!`);
  console.log(`   File: ${OUTPUT_PATH}`);
  console.log(`   Size: ${sizeKB} KB`);
  if (stats.size > 10240) {
    console.log(`   \u2705 Size check passed (>10KB)`);
  } else {
    console.log(`   \u26A0\uFE0F  Size check warning (<10KB)`);
  }
}).catch((err) => {
  console.error("Error generating document:", err);
  process.exit(1);
});
