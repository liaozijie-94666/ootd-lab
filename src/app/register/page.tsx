'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [accept, setAccept] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (form.password !== form.confirm) {
      setError('两次输入的密码不一致')
      return
    }
    if (!accept) {
      setError('请先阅读并同意隐私说明')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          acceptTerms: true,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error?.message ?? '注册失败，请稍后重试')
        return
      }

      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (!result || result.error) {
        setError('注册成功，但自动登录失败，请返回登录页')
        return
      }
      router.push('/outfit-studio')
      router.refresh()
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <Link href="/" className="font-display text-2xl tracking-tight text-ink">
          OOTD Lab
        </Link>
        <h1 className="mt-4 font-display text-xl text-ink">创建账号</h1>
        <p className="mt-1 text-xs text-muted">照片仅用于生成效果，默认加密私有。</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-xs text-muted">
            昵称
            <Input
              className="mt-1.5"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              minLength={2}
              maxLength={20}
              required
            />
          </label>
          <label className="block text-xs text-muted">
            邮箱
            <Input
              className="mt-1.5"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              required
            />
          </label>
          <label className="block text-xs text-muted">
            密码
            <Input
              className="mt-1.5"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              placeholder="至少 8 位，含字母和数字"
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <label className="block text-xs text-muted">
            确认密码
            <Input
              className="mt-1.5"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) => update('confirm', event.target.value)}
              required
            />
          </label>

          <label className="flex items-start gap-2 text-[11px] leading-5 text-muted">
            <input
              type="checkbox"
              checked={accept}
              onChange={(event) => setAccept(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              我已阅读并同意隐私说明：照片仅用于本次生成，不用于模型训练，可随时删除。
              详见{' '}
              <Link href="/legal/privacy" className="text-brand-strong underline-offset-2 hover:underline">
                隐私政策
              </Link>
              （内容待补充）。
            </span>
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? '创建中…' : '创建并登录'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          已有账号？{' '}
          <Link href="/login" className="text-brand-strong underline-offset-2 hover:underline">
            直接登录
          </Link>
        </p>
      </section>
    </main>
  )
}
