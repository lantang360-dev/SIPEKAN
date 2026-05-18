import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || "";

  // Safety check: if no DATABASE_URL, use local SQLite fallback
  if (
    !databaseUrl ||
    databaseUrl === "undefined" ||
    databaseUrl.trim() === ""
  ) {
    console.warn(
      "[DB] DATABASE_URL not set, using local SQLite (file:db/custom.db)",
    );
    return new PrismaClient({
      datasources: {
        db: {
          url: "file:db/custom.db",
        },
      },
    });
  }

  // For local SQLite (file: protocol)
  if (databaseUrl.startsWith("file:")) {
    return new PrismaClient();
  }

  // For Turso / libsql (libsql:// protocol)
  const libsql = createClient({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
