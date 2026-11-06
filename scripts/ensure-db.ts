import 'dotenv/config'
import { readFile, readdir, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { PrismaPGlite } from 'pglite-prisma-adapter'
import { PrismaClient, type Prisma } from '@prisma/client'
import { seed } from '../prisma/seed'
import { acquirePgliteLock, releasePgliteLock } from '../src/server/pglite-lock'

type PrismaAdapter = NonNullable<Prisma.PrismaClientOptions['adapter']>

const MIGRATIONS_DIR = path.join('prisma', 'migrations')
const migrateOnly = process.argv.includes('--migrate-only')

function isDuplicateObject(error: unknown): boolean {
  const code = (error as { code?: string }).code
  if (code && ['42701', '42P07', '42710', '42P16', '42P06'].includes(code)) return true
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes('already exists') ||
    message.includes('duplicate column') ||
    message.includes('duplicate_object')
  )
}

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !item.startsWith('--'))
}

async function applyMigration(pglite: PGlite, name: string, sql: string): Promise<void> {
  try {
    await pglite.exec(sql)
    return
  } catch (error) {
    if (!isDuplicateObject(error)) throw error

    // 兼容早期手工建表/部分迁移：逐条执行，已存在的对象跳过
    console.warn(`[db] ${name} 检测到已存在对象，切换逐条兼容模式`)
    for (const statement of splitStatements(sql)) {
      try {
        await pglite.exec(statement)
      } catch (statementError) {
        if (!isDuplicateObject(statementError)) throw statementError
      }
    }
  }
}

async function migrate(pglite: PGlite) {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS "_app_migrations" (
      "name" TEXT PRIMARY KEY,
      "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  const applied = await pglite.query<{ name: string }>('SELECT name FROM "_app_migrations"')
  const appliedNames = new Set(applied.rows.map((row) => row.name))

  const hasUsers = await pglite.query<{ table: string | null }>(
    `SELECT to_regclass('public.users') AS "table"`,
  )
  // 兼容 M2 之前没有迁移表的数据库：0001 已手工执行过
  if (hasUsers.rows[0]?.table && !appliedNames.has('0001_init')) {
    await pglite.query(`INSERT INTO "_app_migrations" ("name") VALUES ('0001_init') ON CONFLICT DO NOTHING`)
    appliedNames.add('0001_init')
  }

  const entries = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  for (const name of entries) {
    if (appliedNames.has(name)) continue
    const sql = await readFile(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8')
    console.log(`[db] applying migration ${name}…`)
    await applyMigration(pglite, name, sql)
    await pglite.query(`INSERT INTO "_app_migrations" ("name") VALUES ($1) ON CONFLICT DO NOTHING`, [
      name,
    ])
  }
}

async function main() {
  if (process.env.DB_DRIVER === 'postgres') {
    if (!process.env.DATABASE_URL) {
      throw new Error('[db] DB_DRIVER=postgres 时必须设置 DATABASE_URL')
    }
    if (migrateOnly) {
      console.log('[db] postgres 模式请先运行 `pnpm prisma migrate deploy`；本次跳过 seed')
      return
    }
    const prisma = new PrismaClient()
    await seed(prisma)
    await prisma.$disconnect()
    return
  }

  const dataDir = path.resolve(process.cwd(), process.env.OOTD_DATA_DIR ?? '.data')
  const pgDataDir = path.join(dataDir, 'pgdata')
  await mkdir(pgDataDir, { recursive: true })
  acquirePgliteLock(dataDir)

  let pglite: PGlite | undefined
  let prisma: PrismaClient | undefined

  try {
    pglite = new PGlite(pgDataDir)
    await pglite.waitReady

    await migrate(pglite)

    prisma = new PrismaClient({
      adapter: new PrismaPGlite(pglite) as unknown as PrismaAdapter,
    })

    if (!migrateOnly) {
      await seed(prisma)
    }

    const [users, garments] = await Promise.all([prisma.user.count(), prisma.garment.count()])
    console.log(`[db] ready${migrateOnly ? ' (migrate-only)' : ''} · users=${users} garments=${garments}`)
  } finally {
    await prisma?.$disconnect().catch(() => undefined)
    await pglite?.close().catch(() => undefined)
    releasePgliteLock(dataDir)
  }
}

main().catch((error) => {
  console.error('[db] 初始化失败', error)
  process.exit(1)
})
