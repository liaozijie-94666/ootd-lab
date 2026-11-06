import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { RateLimitError, rateLimitHeaders } from '@/server/rate-limit'

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function fail(code: string, message: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json({ error: { code, message, details } }, { status })
}

function zodDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * 统一错误边界：Zod → 400，ApiError → 自身状态码，其余 → 500（不泄露堆栈）。
 */
export async function withApi(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler()
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 429, headers: rateLimitHeaders(error.result) },
      )
    }
    if (error instanceof ApiError) {
      return fail(error.code, error.message, error.status, error.details)
    }
    if (error instanceof ZodError) {
      return fail('VALIDATION_ERROR', '请求参数不合法', 400, zodDetails(error))
    }
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('File too large') || message.includes('body exceeded')) {
      return fail('FILE_TOO_LARGE', '文件超过大小限制', 413)
    }
    console.error('[api] unhandled error:', error)
    return fail('INTERNAL_ERROR', '服务器开小差了，请稍后再试', 500)
  }
}
