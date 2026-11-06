'use client'

import { Check, CircleDashed, ImageIcon, ListChecks, Sparkles, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AiRecommendation, AiTask } from '@/types/recommend'

type StepState = 'done' | 'active' | 'pending' | 'error'

export function RecommendStepper({ rec, task }: { rec: AiRecommendation; task: AiTask | null }) {
  const imageState: StepState = rec.imageUrl
    ? 'done'
    : rec.status === 'DEGRADED' || rec.status === 'FAILED' || task?.status === 'FAILED'
      ? 'error'
      : 'active'

  const steps: Array<{ key: string; label: string; state: StepState; icon: typeof Check }> = [
    { key: 'parse', label: '解析场景', state: 'done', icon: Sparkles },
    { key: 'match', label: '匹配衣服', state: rec.items.length > 0 ? 'done' : 'active', icon: ListChecks },
    { key: 'image', label: '生成效果图', state: imageState, icon: ImageIcon },
    {
      key: 'done',
      label: '返回推荐',
      state: rec.status === 'PENDING' ? 'pending' : 'done',
      icon: Check,
    },
  ]

  return (
    <ol className="grid grid-cols-4 gap-2 rounded-2xl border border-line bg-surface p-3 sm:gap-4 sm:p-4">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isDone = step.state === 'done'
        const isError = step.state === 'error'
        const isActive = step.state === 'active'

        return (
          <li key={step.key} className="relative flex flex-col items-center gap-1.5 text-center">
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  'absolute left-[calc(50%+18px)] top-3.5 hidden h-px w-[calc(100%-36px)] sm:block',
                  isDone ? 'bg-brand/40' : 'bg-line',
                )}
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 grid size-8 place-items-center rounded-full border text-[11px] transition-colors',
                isDone && 'border-brand bg-brand text-white',
                isActive && 'border-brand bg-brand-soft text-brand',
                isError && 'border-amber-300 bg-amber-50 text-amber-700',
                step.state === 'pending' && 'border-line bg-paper text-muted',
              )}
            >
              {isDone ? <Check className="size-4" /> : isError ? <TriangleAlert className="size-4" /> : isActive ? <Icon className="size-4" /> : <CircleDashed className="size-4" />}
            </span>
            <span
              className={cn(
                'text-[11px] leading-tight',
                isDone || isActive ? 'text-ink' : 'text-muted',
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
