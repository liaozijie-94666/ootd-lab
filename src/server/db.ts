import path from 'node:path'
import { createRequire } from 'node:module'
import type { PGlite as PGliteClient } from '@electric-sql/pglite'
import { PrismaClient, type Prisma } from '@prisma/client'
import { serverEnv } from '@/server/env'

type PrismaAdapter = NonNullable<Prisma.PrismaClientOptions['adapter']>

type GlobalWithDb = typeof globalThis & {
  __ootdPrisma?: PrismaClient
  __ootdPglite?: PGliteClient
}

const globalWithDb = globalThis as GlobalWithDb
const nodeRequire = createRequire(import.meta.url)

function createPrismaClient(): PrismaClient {
  if (serverEnv.dbDriver === 'postgres' && serverEnv.databaseUrl) {
    return new PrismaClient()
  }

  // Netlify/Supabase 走 postgres 分支时不要加载 PGlite WASM，
  // 否则每次 Serverless 冷启动都会被几 MB 的 WASM 拖慢。
  const { PGlite } = nodeRequire('@electric-sql/pglite') as typeof import('@electric-sql/pglite')
  const { PrismaPGlite } = nodeRequire('pglite-prisma-adapter') as typeof import('pglite-prisma-adapter')

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
