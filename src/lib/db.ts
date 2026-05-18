import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

function createPrismaClient() {
  // TURSO_DATABASE_URL is the real Turso/libsql URL (libsql://...)
  // DATABASE_URL is only for Prisma schema validation (file:./dummy.db)
  // We use SEPARATE env vars to avoid Prisma's SQLite provider
  // rejecting the libsql:// URL format.
  const tursoUrl = process.env.TURSO_DATABASE_URL || ''

  if (tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('http://') || tursoUrl.startsWith('https://')) {
    // Production: Connect to Turso via adapter
    const libsql = createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  // Local development: Use standard Prisma with SQLite
  return new PrismaClient()
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
