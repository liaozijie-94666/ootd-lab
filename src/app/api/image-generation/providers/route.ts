import { withApi, ok } from '@/server/http'
import { providerStatus } from '@/server/ai/generation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 只暴露供应商能力与是否配置，不返回任何 Key。 */
export async function GET() {
  return withApi(async () => ok({ providers: providerStatus() }))
}
