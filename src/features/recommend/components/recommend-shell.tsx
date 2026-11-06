'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Layers, Sparkles, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api-client'
import type {
  AiRecommendation,
  AiTask,
  RecommendFormValues,
  RecommendPayload,
} from '@/types/recommend'
import { recommendApi } from '../api'
import { DEFAULT_FORM_VALUES, RecommendForm } from './recommend-form'
import { RecommendResult } from './recommend-result'

function buildPayload(values: RecommendFormValues): RecommendPayload | null {
  const scene = values.scene.trim()
  if (scene.length < 2 || scene.length > 200) {
    toast.error('场景描述需要 2–200 字')
    return null
  }

  const heightCm = values.heightCm ? Number(values.heightCm) : undefined
  if (heightCm != null && (heightCm < 120 || heightCm > 230)) {
    toast.error('身高需在 120–230cm 之间')
    return null
  }

  const weightKg = values.weightKg ? Number(values.weightKg) : undefined
  if (weightKg != null && (weightKg < 30 || weightKg > 200)) {
    toast.error('体重需在 30–200kg 之间')
    return null
  }

  const tempC = values.tempC ? Number(values.tempC) : undefined
  if (tempC != null && (tempC < -30 || tempC > 45)) {
    toast.error('温度需在 -30–45℃ 之间')
    return null
  }

  const budget = values.budget ? Number(values.budget) : undefined
  const weather =
    values.condition || tempC != null
      ? { condition: values.condition || undefined, tempC }
      : undefined

  return {
    scene,
    gender: values.gender,
    heightCm,
    weightKg,
    styles: values.styles,
    budget,
    city: values.city.trim() || undefined,
    weather,
    avoidColors: values.avoidColors,
    formality: values.formality || undefined,
  }
}

export function RecommendShell() {
  const [phase, setPhase] = useState<'form' | 'result'>('form')
  const [formValues, setFormValues] = useState<RecommendFormValues>(DEFAULT_FORM_VALUES)
  const [rec, setRec] = useState<AiRecommendation | null>(null)
  const [task, setTask] = useState<AiTask | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [rerolling, setRerolling] = useState(false)
  const [favoriting, setFavoriting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!rec || rec.status !== 'PENDING') return
    let cancelled = false

    const tick = async () => {
      try {
        const detail = await recommendApi.get(rec.id)
        if (cancelled) return
        setRec(detail.recommendation)
        setTask(detail.task)
      } catch {
        // 轮询失败不打扰用户，下一轮继续
      }
    }

    const timer = setInterval(() => {
      void tick()
    }, 1500)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [rec?.id, rec?.status])

  const handleSubmit = async (values: RecommendFormValues) => {
    const payload = buildPayload(values)
    if (!payload) return

    setSubmitting(true)
    try {
      const response = await recommendApi.create(payload)
      setFormValues(values)
      setRec(response.recommendation)
      setTask(
        response.taskId
          ? { id: response.taskId, status: 'QUEUED', progress: 0, error: null }
          : null,
      )
      setPhase('result')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : '生成失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReroll = async () => {
    if (!rec) return
    setRerolling(true)
    try {
      const response = await recommendApi.reroll(rec.id)
      setRec(response.recommendation)
      setTask(
        response.taskId
          ? { id: response.taskId, status: 'QUEUED', progress: 0, error: null }
          : null,
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      toast.success('换了一套，下拉看看新搭配')
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : '换一套失败，请重试')
    } finally {
      setRerolling(false)
    }
  }

  const handleFavorite = async () => {
    if (!rec || favoriting) return
    const next = !rec.isFavorite
    setFavoriting(true)
    setRec({ ...rec, isFavorite: next })
    try {
      const result = await recommendApi.favorite(rec.id)
      setRec((prev) => (prev ? { ...prev, isFavorite: result.favorited } : prev))
    } catch (error) {
      setRec((prev) => (prev ? { ...prev, isFavorite: !next } : prev))
      toast.error(error instanceof ApiClientError ? error.message : '收藏失败')
    } finally {
      setFavoriting(false)
    }
  }

  const handleSave = async () => {
    if (!rec || rec.savedAt) return
    setSaving(true)
    try {
      await recommendApi.save(rec.id)
      setRec({ ...rec, savedAt: new Date().toISOString() })
      toast.success('已保存到「我的搭配」')
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async (title: string, body: string): Promise<boolean> => {
    if (!rec) return false
    setSharing(true)
    try {
      await recommendApi.share(rec.id, { title, body })
      toast.success('已分享到讨论区')
      return true
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : '分享失败')
      return false
    } finally {
      setSharing(false)
    }
  }

  const handleRetryImage = async () => {
    if (!rec) return
    try {
      const { taskId } = await recommendApi.retryImage(rec.id)
      setRec({ ...rec, status: 'PENDING', imageError: null })
      setTask({ id: taskId, status: 'QUEUED', progress: 0, error: null })
      toast.success('已重新提交出图任务')
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : '重试失败')
    }
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-display text-lg tracking-tight">
              OOTD Lab
            </Link>
            <span className="text-[11px] text-muted">/ AI 推荐</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <Link
              href="/outfit-studio"
              className="hidden items-center gap-1 rounded-full border border-line px-2.5 py-1 transition-colors hover:border-camel hover:text-ink sm:flex"
            >
              <ArrowLeft className="size-3" />
              去自由搭配
            </Link>
            <span className="rounded-full bg-brand-soft px-2 py-1 font-medium text-brand-strong">
              Mock 造型师
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
        {phase === 'form' || !rec ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="mb-4">
                <p className="text-[11px] font-medium tracking-[0.2em] text-camel">AI STYLIST</p>
                <h1 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">
                  说说你要去哪儿，
                  <br className="sm:hidden" />
                  剩下的交给造型师
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                  先解析场景与正式度，再从站内 48 件真实单品里组合；站内没有合适单品时，会明确标注「AI 建议」。
                </p>
              </div>
              <RecommendForm initial={formValues} submitting={submitting} onSubmit={handleSubmit} />
            </div>

            <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-3xl bg-ink p-5 text-white">
                <Sparkles className="size-5 text-camel" />
                <p className="mt-3 font-display text-xl leading-snug">不是随机推荐</p>
                <ol className="mt-3 space-y-2.5">
                  {[
                    { icon: Layers, title: '解析场景', desc: '识别场合、正式度、季节与天气风险' },
                    { icon: Wand2, title: '检索衣橱', desc: '按风格/季节/预算/禁忌色打分，每个品类取 Top 4' },
                    { icon: Sparkles, title: '组合出图', desc: '生成理由 + 异步效果图，失败保留文字方案' },
                  ].map((item, index) => {
                    const Icon = item.icon
                    return (
                      <li key={item.title} className="flex gap-2.5">
                        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[10px]">
                          {index + 1}
                        </span>
                        <span>
                          <span className="block text-xs font-medium">
                            <Icon className="mr-1 inline size-3" />
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-white/60">
                            {item.desc}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </div>

              <div className="rounded-3xl border border-line bg-surface p-5">
                <p className="text-xs font-medium text-ink">推荐原则</p>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
                  <li>· 先满足场合与天气，再谈好看</li>
                  <li>· 预算内优先，超支会说清原因</li>
                  <li>· 禁忌色直接排除，不做「稍微一点」</li>
                  <li>· 不需要上传照片，也能生成穿搭画报</li>
                </ul>
              </div>
            </aside>
          </div>
        ) : (
          <RecommendResult
            rec={rec}
            task={task}
            rerolling={rerolling}
            favoriting={favoriting}
            saving={saving}
            sharing={sharing}
            onReroll={() => void handleReroll()}
            onFavorite={() => void handleFavorite()}
            onSave={() => void handleSave()}
            onShare={handleShare}
            onRetryImage={() => void handleRetryImage()}
            onReset={() => {
              setPhase('form')
              setRec(null)
              setTask(null)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        )}
      </main>
    </div>
  )
}
