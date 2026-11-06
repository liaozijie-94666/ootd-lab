'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next')?.startsWith('/') ? params.get('next')! : '/outfit-studio'

  const [email, setEmail] = useState('demo@ootd.local')
  const [password, setPassword] = useState('Demo1234!')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (!result || result.error) {
        setError('邮箱或密码错误；连续失败 5 次会锁定 15 分钟')
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setError('登录失败，请检查网络后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto grid min-h-dvh max-w-5xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <Link href="/" className="font-display text-3xl tracking-tight text-ink">
            OOTD Lab
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            登录后使用自由搭配、AI 推荐与讨论区。照片默认加密私有，只有你本人可以访问。
          </p>
          <div className="mt-8 grid gap-3 text-sm">
            {['上传照片前单独授权，可随时拒绝', '人脸/全身照 AES-256-GCM 加密', '生成结果分享前必须确认'].map(
              (item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3">
                  <LockKeyhole className="size-4 text-brand-strong" />
                  <span>{item}</span>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Welcome back</p>
          <h1 className="mt-2 font-display text-2xl text-ink">登录 OOTD Lab</h1>
          <p className="mt-1 text-xs text-muted">使用邮箱和密码继续</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-xs text-muted">
              邮箱
              <Input
                className="mt-1.5"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-xs text-muted">
              密码
              <Input
                className="mt-1.5"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? '登录中…' : '登录'}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted">
            还没有账号？{' '}
            <Link href="/register" className="text-brand-strong underline-offset-2 hover:underline">
              创建账号
            </Link>
          </p>

          <div className="mt-6 rounded-xl border border-dashed border-line px-4 py-3 text-[11px] leading-5 text-muted">
            <p className="font-medium text-ink">演示账号</p>
            <p>demo@ootd.local / Demo1234!</p>
            <p>admin@ootd.local / Admin1234!（管理员）</p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-muted">加载中…</div>}>
      <LoginForm />
    </Suspense>
  )
}
