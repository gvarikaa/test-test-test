import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Export both as db and prisma for compatibility with different imports
export const db = client;
export const prisma = client;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;