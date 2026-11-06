import { NextResponse } from 'next/server'
import { requireUser } from '@/server/auth'
import { withApi } from '@/server/http'
import { enforceRateLimit } from '@/server/rate-limit'
import { exportFileName, exportUserData } from '@/server/services/privacy.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return withApi(async () => {
    const user = await requireUser()
    enforceRateLimit(`account:export:${user.id}`, 3, 24 * 60 * 60_000)
    const data = await exportUserData(user.id)
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFileName(user.id)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  })
}
