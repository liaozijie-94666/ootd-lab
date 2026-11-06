import { access } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { prisma } from '@/server/db'
import { serverEnv } from '@/server/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const started = Date.now()
  const checks: Record<string, 'ok' | 'error'> = { db: 'ok', storage: 'ok' }

  try {
    await prisma.user.count()
  } catch {
    checks.db = 'error'
  }

  try {
    await access(serverEnv.dataDir)
  } catch {
    checks.storage = 'error'
  }

  if (process.env.STORAGE_DRIVER === 'supabase') {
    checks.storage =
      process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
        ? 'ok'
        : 'error'
  }

  const ok = Object.values(checks).every((value) => value === 'ok')
  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      checks,
      queue: 'inline',
      dbDriver: serverEnv.dbDriver,
      uptimeSec: Math.round(process.uptime()),
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  )
}
