'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Download, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Consent {
  id: string
  type: string
  granted: boolean
  policyVersion: string
  grantedAt: string
  revokedAt: string | null
  mediaAssetId: string | null
}

const LABEL: Record<string, string> = {
  FACE_IMAGE_PROCESSING: '人脸照处理',
  FULL_BODY_PROCESSING: '全身照处理',
}

export default function PrivacyCenterPage() {
  const [consents, setConsents] = useState<Consent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/me/consents')
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? '加载失败')
      setConsents(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function revoke(id: string) {
    setBusy(id)
    setError(null)
    try {
      const response = await fetch('/api/me/consents/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentId: id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? '撤回失败')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤回失败')
    } finally {
      setBusy(null)
    }
  }

  async function deleteAccount() {
    if (confirm !== 'DELETE') {
      setError('请输入 DELETE 以确认注销')
      return
    }
    setBusy('account')
    setError(null)
    try {
      const response = await fetch('/api/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirm: 'DELETE' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? '注销失败')
      await signOut({ callbackUrl: '/login' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '注销失败')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-sm">
      <Link href="/outfit-studio" className="font-display text-2xl tracking-tight">
        OOTD Lab
      </Link>
      <h1 className="mt-6 font-display text-2xl">隐私中心</h1>
      <p className="mt-1 text-xs text-muted">
        管理照片授权、导出数据或注销账号。人脸/全身照默认加密私有，不用于模型训练。
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand-strong" />
          <h2 className="font-medium">照片处理授权</h2>
        </div>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <Loader2 className="size-3.5 animate-spin" /> 加载中…
          </p>
        ) : consents.length === 0 ? (
          <p className="mt-4 text-xs text-muted">还没有照片授权记录。</p>
        ) : (
          <div className="mt-4 space-y-2">
            {consents.map((consent) => (
              <div
                key={consent.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium">
                    {LABEL[consent.type] ?? consent.type}
                    <span className="ml-2 text-[10px] text-muted">v{consent.policyVersion}</span>
                  </p>
                  <p className="text-[11px] text-muted">
                    {consent.granted ? '已授权' : '已撤回'} ·{' '}
                    {new Date(consent.revokedAt ?? consent.grantedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                {consent.granted ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy === consent.id}
                    onClick={() => void revoke(consent.id)}
                  >
                    {busy === consent.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    撤回并删除源图
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">导出我的数据</h2>
        <p className="mt-1 text-xs text-muted">下载 JSON：资料、授权记录、方案、推荐、帖子、评论。</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <a href="/api/me/export">
            <Download className="size-3.5" />
            下载数据
          </a>
        </Button>
      </section>

      <section className="mt-4 rounded-2xl border border-red-200 bg-red-50/40 p-5">
        <h2 className="flex items-center gap-2 font-medium text-red-800">
          <Trash2 className="size-4" />
          注销账号
        </h2>
        <p className="mt-1 text-xs leading-5 text-red-700">
          将立即停止账号访问、删除照片/结果文件并匿名化资料。此操作不可撤销。
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input
            type="password"
            placeholder="输入登录密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            placeholder="输入 DELETE 确认"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 border-red-300 text-red-700 hover:bg-red-50"
          disabled={busy === 'account'}
          onClick={() => void deleteAccount()}
        >
          {busy === 'account' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          永久注销
        </Button>
      </section>
    </main>
  )
}
