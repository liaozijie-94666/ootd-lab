import { withApi, ok } from '@/server/http'
import { providerStatus } from '@/server/ai/generation'
import { serverEnv } from '@/server/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 公共前端配置：只返回能力/限制，不返回任何密钥。 */
export async function GET() {
  return withApi(async () =>
    ok({
      appName: 'OOTD Lab',
      auth: 'credentials',
      maxUploadBytes: serverEnv.maxUploadBytes,
      policyVersion: '2026-11-01',
      imageProviders: providerStatus().map((provider) => ({
        id: provider.id,
        configured: provider.configured,
      })),
    }),
  )
}
