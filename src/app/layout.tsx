import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "SIPEKAN",
  description:
    process.env.NEXT_PUBLIC_APP_SUBTITLE ||
    "Sistem Informasi Pelayanan Besukan Lapas",
  keywords: [
    "SIPEKAN",
    "Lapas",
    "Besukan",
    "Antrian",
    "Pelayanan Publik",
    "Kunjungan",
  ],
  authors: [{ name: "SIPEKAN Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: process.env.NEXT_PUBLIC_APP_NAME || "SIPEKAN",
    description:
      process.env.NEXT_PUBLIC_APP_SUBTITLE ||
      "Sistem Informasi Pelayanan Besukan Lapas",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
