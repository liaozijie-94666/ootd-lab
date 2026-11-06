import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { PrismaPGlite } from 'pglite-prisma-adapter'
import { PrismaClient, type Prisma } from '@prisma/client'
import { serverEnv } from '@/server/env'

type PrismaAdapter = NonNullable<Prisma.PrismaClientOptions['adapter']>

type GlobalWithDb = typeof globalThis & {
  __ootdPrisma?: PrismaClient
  __ootdPglite?: PGlite
}

const globalWithDb = globalThis as GlobalWithDb

function createPrismaClient(): PrismaClient {
  if (serverEnv.dbDriver === 'postgres' && serverEnv.databaseUrl) {
    return new PrismaClient()
  }

  const dataDir = path.join(serverEnv.dataDir, 'pgdata')
  const pglite = new PGlite(dataDir)
  globalWithDb.__ootdPglite = pglite

  return new PrismaClient({
    // pglite-prisma-adapter 依赖的 driver-adapter-utils 版本与 @prisma/client 不同，
    // 运行时契约一致，这里做一次类型对齐（见 docs/08 说明）。
    adapter: new PrismaPGlite(pglite) as unknown as PrismaAdapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma: PrismaClient = globalWithDb.__ootdPrisma ?? createPrismaClient()

if (!globalWithDb.__ootdPrisma) {
  globalWithDb.__ootdPrisma = prisma
}
