import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSchemaVersion: string | undefined
}

// Track schema version so we recreate the client when the schema changes.
const currentVersion = 'v4-latinTyping'

if (
  process.env.NODE_ENV !== 'production' &&
  globalForPrisma.prismaSchemaVersion !== currentVersion
) {
  globalForPrisma.prisma = undefined
  globalForPrisma.prismaSchemaVersion = currentVersion
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

