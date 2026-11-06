import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { clientIp, rateLimit, rateLimitHeaders } from '@/server/rate-limit'
import { authSecret } from '@/server/auth-secret'

const PROTECTED = [
  '/outfit-studio',
  '/ai-recommend',
  '/community',
  '/profile',
  '/me',
]

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // 写接口 Origin 校验（Auth.js 自带 CSRF，不在此列）
  const method = request.method.toUpperCase()
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth') &&
    !['GET', 'HEAD', 'OPTIONS'].includes(method)
  ) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json(
            { error: { code: 'INVALID_ORIGIN', message: '跨站请求被拒绝' } },
            { status: 403 },
          )
        }
      } catch {
        return NextResponse.json(
          { error: { code: 'INVALID_ORIGIN', message: 'Origin 不合法' } },
          { status: 403 },
        )
      }
    }
  }

  // 通用读接口兜底限流（写入接口在路由内按用户限流）
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth') &&
    !['/api/health', '/api/config'].includes(pathname) &&
    (method === 'GET' || method === 'HEAD')
  ) {
    const limited = rateLimit(`read:${clientIp(request)}`, 240, 60_000)
    if (!limited.ok) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后重试' } },
        { status: 429, headers: rateLimitHeaders(limited) },
      )
    }
  }

  if (!PROTECTED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: authSecret(),
    secureCookie: request.nextUrl.protocol === 'https:',
  })

  if (token) return NextResponse.next()

  const login = new URL('/login', request.url)
  login.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: [
    '/outfit-studio/:path*',
    '/ai-recommend/:path*',
    '/community/:path*',
    '/profile/:path*',
    '/me/:path*',
    '/api/:path*',
  ],
}
