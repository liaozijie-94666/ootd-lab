import type { NextResponse } from 'next/server'

export interface RateLimitResult {
  ok: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfter: number
}

interface Bucket {
  count: number
  resetAt: number
}

type GlobalWithBuckets = typeof globalThis & {
  __ootdRateBuckets?: Map<string, Bucket>
}

const globalWithBuckets = globalThis as GlobalWithBuckets
const buckets = globalWithBuckets.__ootdRateBuckets ?? new Map<string, Bucket>()
globalWithBuckets.__ootdRateBuckets = buckets

function prune(now: number) {
  if (buckets.size < 5000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/**
 * 进程内固定窗口限流。单实例/本地开发有效；
 * 多实例部署需替换为 Redis 滑窗（见 docs/14 P1-02）。
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  prune(now)

  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }

  bucket.count += 1
  const remaining = Math.max(0, limit - bucket.count)
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))

  return {
    ok: bucket.count <= limit,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfter,
  }
}

export class RateLimitError extends Error {
  readonly code = 'RATE_LIMITED'
  readonly status = 429
  readonly result: RateLimitResult

  constructor(result: RateLimitResult) {
    super(`请求过于频繁，请在 ${result.retryAfter} 秒后重试`)
    this.name = 'RateLimitError'
    this.result = result
  }
}

export function enforceRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const result = rateLimit(key, limit, windowMs)
  if (!result.ok) throw new RateLimitError(result)
  return result
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.ok ? {} : { 'Retry-After': String(result.retryAfter) }),
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  )
}

/** 给 withApi 用：把限流结果写入响应头（错误响应也会带） */
export function applyRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  for (const [key, value] of Object.entries(rateLimitHeaders(result))) {
    response.headers.set(key, value)
  }
  return response
}
