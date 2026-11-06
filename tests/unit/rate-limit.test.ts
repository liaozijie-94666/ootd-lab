import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { enforceRateLimit, rateLimit } from '@/server/rate-limit'

describe('rate limit', () => {
  it('固定窗口内超过阈值后拒绝', () => {
    const key = `test:${crypto.randomUUID()}`
    expect(rateLimit(key, 2, 60_000).ok).toBe(true)
    expect(rateLimit(key, 2, 60_000).ok).toBe(true)
    const blocked = rateLimit(key, 2, 60_000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('enforceRateLimit 抛出可被 withApi 识别的错误', () => {
    const key = `test:${crypto.randomUUID()}`
    enforceRateLimit(key, 1, 60_000)
    expect(() => enforceRateLimit(key, 1, 60_000)).toThrowError(/请求过于频繁/)
  })
})
