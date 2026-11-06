'use client'

import { useState } from 'react'
import {
  BookmarkCheck,
  BookmarkPlus,
  Heart,
  ImageOff,
  Pencil,
  RefreshCw,
  Share2,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { SEASON_LABEL } from '@/lib/taxonomy'
import type { AiRecommendation, AiTask } from '@/types/recommend'
import { RecommendStepper } from './recommend-stepper'
import { BudgetMeter } from './budget-meter'
import { RecommendItemCard } from './recommend-item-card'
import { RecommendShareDialog } from './recommend-share-dialog'

const OCCASION_LABEL: Record<string, string> = {
  DATE: '约会',
  INTERVIEW: '面试',
  WEDDING: '婚礼',
  COMMUTE: '通勤',
  PARTY: '派对',
  TRAVEL: '旅行',
  SPORT: '运动',
  DAILY: '日常',
}

function stageText(task: AiTask | null): string {
  switch (task?.status) {
    case 'PREPROCESSING':
      return '正在加载单品素材'
    case 'RUNNING':
      return '正在合成推荐效果图'
    case 'POSTPROCESSING':
      return '正在保存结果'
    default:
      return '正在准备推荐'
  }
}

export function RecommendResult({
  rec,
  task,
  rerolling,
  favoriting,
  saving,
  sharing,
  onReroll,
  onFavorite,
  onSave,
  onShare,
  onRetryImage,
  onReset,
}: {
  rec: AiRecommendation
  task: AiTask | null
  rerolling: boolean
  favoriting: boolean
  saving: boolean
  sharing: boolean
  onReroll: () => void
  onFavorite: () => void
  onSave: () => void
  onShare: (title: string, body: string) => Promise<boolean>
  onRetryImage: () => void
  onReset: () => void
}) {
  const [shareOpen, setShareOpen] = useState(false)
  const progress = task?.progress ?? 0
  const pending = rec.status === 'PENDING'
  const imageFailed = !rec.imageUrl && !pending

  return (
    <div className="space-y-5">
      <RecommendStepper rec={rec} task={task} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-line bg-paper-deep shadow-soft">
            {rec.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rec.imageUrl} alt="推荐穿搭效果图" className="size-full object-cover" />
            ) : pending ? (
              <div className="absolute inset-0 grid place-items-center">
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <div
                    className="relative grid size-20 place-items-center rounded-full p-[5px]"
                    style={{
                      background: `conic-gradient(#b4552d ${Math.max(progress, 5)}%, #e9e2d8 0)`,
                    }}
                  >
                    <div className="grid size-full place-items-center rounded-full bg-surface">
                      <span className="text-sm font-semibold">{progress}%</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-ink-soft">{stageText(task)}</p>
                  <p className="text-[11px] text-muted">文字方案已生成，图片稍后补上</p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 grid place-items-center px-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
                    <ImageOff className="size-5" />
                  </span>
                  <p className="text-sm font-medium text-ink">效果图生成失败</p>
                  <p className="text-[11px] leading-relaxed text-muted">
                    {rec.imageError ?? '已保留完整文字方案，可稍后重试'}
                  </p>
                  {task ? (
                    <Button size="sm" variant="outline" onClick={onRetryImage}>
                      <RefreshCw className="size-3.5" />
                      重试出图
                    </Button>
                  ) : null}
                </div>
              </div>
            )}

            <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
              <Badge tone="brand">
                <Sparkles className="size-2.5" />
                AI 搭配
              </Badge>
              {rec.status === 'DEGRADED' ? <Badge tone="warning">仅文字方案</Badge> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onReroll} loading={rerolling}>
              <Wand2 className="size-4" />
              换一套
            </Button>
            <Button variant="outline" onClick={onFavorite} loading={favoriting}>
              <Heart className={cn('size-4', rec.isFavorite && 'fill-brand text-brand')} />
              {rec.isFavorite ? '已收藏' : '收藏'}
            </Button>
            <Button variant="outline" onClick={onSave} disabled={Boolean(rec.savedAt)} loading={saving}>
              {rec.savedAt ? <BookmarkCheck className="size-4" /> : <BookmarkPlus className="size-4" />}
              {rec.savedAt ? '已保存' : '保存'}
            </Button>
            <Button variant="outline" onClick={() => setShareOpen(true)}>
              <Share2 className="size-4" />
              分享
            </Button>
          </div>

          <p className="text-center text-[10px] leading-relaxed text-muted">
            效果图为 Mock 合成，仅用于搭配预览；单品信息来自站内衣橱。
          </p>
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {rec.parsed?.occasion ? (
                <Badge>{OCCASION_LABEL[rec.parsed.occasion] ?? rec.parsed.occasion}</Badge>
              ) : null}
              {rec.parsed?.formality ? <Badge>正式度 {rec.parsed.formality}/5</Badge> : null}
              {rec.parsed?.season ? <Badge>{SEASON_LABEL[rec.parsed.season as keyof typeof SEASON_LABEL] ?? rec.parsed.season}</Badge> : null}
              <button
                type="button"
                onClick={onReset}
                className="ml-auto flex items-center gap-1 text-[11px] text-muted hover:text-ink"
              >
                <Pencil className="size-3" />
                重新填写
              </button>
            </div>

            <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{rec.styleSummary}</h1>
            <p className="mt-1 text-xs text-muted">场景：{rec.scene}</p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[11px] font-medium tracking-wide text-muted">为什么这样搭</p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">{rec.reason}</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg">这套用什么</h2>
              <span className="text-[11px] text-muted">{rec.items.length} 件</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {rec.items.map((item, index) => (
                <RecommendItemCard key={`${item.clothingId ?? item.name}-${index}`} item={item} index={index} />
              ))}
            </div>
          </div>

          <BudgetMeter
            budget={rec.budget}
            aiCount={rec.items.filter((item) => item.isAiSuggested).length}
          />

          {rec.tips.length || rec.avoidTips.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {rec.tips.length ? (
                <div className="rounded-2xl border border-line bg-surface p-4">
                  <p className="text-[11px] font-medium text-success">搭配建议</p>
                  <ul className="mt-2 space-y-1.5">
                    {rec.tips.map((tip) => (
                      <li key={tip} className="flex gap-1.5 text-[11px] leading-relaxed text-ink-soft">
                        <span className="text-success">✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {rec.avoidTips.length ? (
                <div className="rounded-2xl border border-line bg-surface p-4">
                  <p className="text-[11px] font-medium text-amber-700">避雷</p>
                  <ul className="mt-2 space-y-1.5">
                    {rec.avoidTips.map((tip) => (
                      <li key={tip} className="flex gap-1.5 text-[11px] leading-relaxed text-ink-soft">
                        <span className="text-amber-600">!</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="pb-4 text-[10px] text-muted">
            由 {rec.provider ?? 'rule-stylist'} 生成 · {new Date(rec.createdAt).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>

      <RecommendShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        defaultTitle={rec.styleSummary}
        defaultBody={rec.reason}
        sharing={sharing}
        onConfirm={async (title, body) => {
          const ok = await onShare(title, body)
          if (ok) setShareOpen(false)
        }}
      />
    </div>
  )
}
