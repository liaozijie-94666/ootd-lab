/**
 * Auth.js 密钥解析。生产必须显式配置 AUTH_SECRET；
 * 本地开发允许固定 fallback，保证 clone 后无 .env 也能登录演示。
 */
export function authSecret(): string | undefined {
  const configured = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
  if (configured) return configured
  if (process.env.NODE_ENV === 'production') {
    console.warn('[auth] 生产环境缺少 AUTH_SECRET，登录将不可用')
    return undefined
  }
  return 'ootd-lab-dev-auth-secret-change-me'
}
