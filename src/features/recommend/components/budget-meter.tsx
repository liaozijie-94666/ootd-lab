'use client'

import { CheckCircle2, CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BudgetInfo } from '@/types/recommend'

export function BudgetMeter({ budget, aiCount = 0 }: { budget: BudgetInfo; aiCount?: number }) {
  const note =
    aiCount > 0 ? (
      <p className="mt-1.5 text-[10px] text-muted">不含 {aiCount} 件 AI 建议单品（无站内价格）</p>
    ) : null

  if (budget.limit == null) {
    return (
      <div className="rounded-2xl border border-line bg-surface px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">参考总价</span>
          <span className="font-display text-xl">¥{budget.total.toLocaleString('zh-CN')}</span>
        </div>
        {note}
      </div>
    )
  }

  const ratio = Math.min(100, Math.round((budget.total / budget.limit) * 100))
  const over = budget.match === 'over'

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted">参考总价</p>
          <p className="mt-1 font-display text-2xl leading-none">
            ¥{budget.total.toLocaleString('zh-CN')}
            <span className="ml-1 text-xs font-sans text-muted">
              / 预算 ¥{budget.limit.toLocaleString('zh-CN')}
            </span>
          </p>
        </div>
        <span
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-1 text-[11px]',
            over ? 'bg-amber-50 text-amber-700' : 'bg-success/10 text-success',
          )}
        >
          {over ? <CircleAlert className="size-3" /> : <CheckCircle2 className="size-3" />}
          {over
            ? `超预算 ¥${Math.abs(budget.diff).toLocaleString('zh-CN')}`
            : `预算内，剩 ¥${budget.diff.toLocaleString('zh-CN')}`}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-deep">
        <div
          className={cn('h-full rounded-full transition-all', over ? 'bg-amber-500' : 'bg-brand')}
          style={{ width: `${Math.max(4, ratio)}%` }}
        />
      </div>
      {over ? (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-700">
          超出部分主要来自高价单品，可以去掉包或外套，用已有单品替代。
        </p>
      ) : null}
      {note}
    </div>
  )
}
