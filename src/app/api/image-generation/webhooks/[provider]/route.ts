import { withApi, ok } from '@/server/http'
import { imageGenerationService } from '@/server/ai/generation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  return withApi(async () => {
    const { provider } = await context.params
    const rawBody = await request.text()
    return ok(await imageGenerationService.handleWebhook(provider, request.headers, rawBody))
  })
}
