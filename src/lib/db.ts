import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || "";

  if (databaseUrl.startsWith("file:")) {
    return new PrismaClient();
  }

  const libsql = createClient({ url: databaseUrl });
  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
