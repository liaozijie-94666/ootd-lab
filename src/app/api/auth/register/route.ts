import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { withApi, ok, ApiError } from '@/server/http'
import { clientIp, enforceRateLimit } from '@/server/rate-limit'
import { assertTextSafe } from '@/server/ai/generation/safety'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  name: z.string().trim().min(2, '昵称至少 2 个字').max(20),
  email: z.string().trim().email('邮箱格式不正确').max(120),
  password: z
    .string()
    .min(8, '密码至少 8 位')
    .max(72, '密码最多 72 位')
    .regex(/[A-Za-z]/, '密码需包含字母')
    .regex(/\d/, '密码需包含数字'),
  acceptTerms: z.literal(true),
})

function baseHandle(name: string, email: string): string {
  const fromName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)
  const fromEmail = email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)
  return fromName || fromEmail || 'user'
}

async function uniqueHandle(name: string, email: string): Promise<string> {
  const base = baseHandle(name, email)
  for (let index = 0; index < 30; index += 1) {
    const candidate = index === 0 ? base : `${base}${index + 1}`
    const exists = await prisma.user.findUnique({ where: { handle: candidate }, select: { id: true } })
    if (!exists) return candidate
  }
  return `${base}${Date.now().toString(36).slice(-5)}`
}

export async function POST(request: Request) {
  return withApi(async () => {
    enforceRateLimit(`register:ip:${clientIp(request)}`, 5, 60 * 60_000)

    const body = await request.json().catch(() => {
      throw new ApiError('VALIDATION_ERROR', '请求体不是合法的 JSON', 400)
    })
    const input = registerSchema.parse(body)
    const email = input.email.toLowerCase()

    enforceRateLimit(`register:email:${email}`, 3, 60 * 60_000)
    assertTextSafe({ stylePrompt: input.name })

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) throw new ApiError('EMAIL_TAKEN', '该邮箱已注册，请直接登录', 409)

    const passwordHash = await hash(input.password, 12)
    const handle = await uniqueHandle(input.name, email)

    const user = await prisma.user.create({
      data: {
        email,
        handle,
        name: input.name,
        passwordHash,
        profile: {
          create: {
            displayName: input.name,
            isPublic: true,
          },
        },
      },
      select: { id: true, email: true, name: true, handle: true },
    })

    return ok({ user }, 201)
  })
}
