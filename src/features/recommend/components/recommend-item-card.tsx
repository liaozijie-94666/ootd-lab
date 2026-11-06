'use client'

import { ExternalLink, Shirt, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/primitives'
import { CATEGORY_LABEL, COLOR_LABEL } from '@/lib/taxonomy'
import { cn } from '@/lib/utils'
import type { AiItem } from '@/types/recommend'

export function RecommendItemCard({ item, index }: { item: AiItem; index: number }) {
  return (
    <article
      className={cn(
        'flex gap-3 rounded-2xl border bg-surface p-3',
        item.isAiSuggested ? 'border-dashed border-camel/60 bg-paper/60' : 'border-line',
      )}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_40%,#f7f2ea,#ece4d8)]">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="size-full object-contain p-1" />
        ) : (
          <span className="grid size-full place-items-center text-camel">
            <Shirt className="size-6" />
          </span>
        )}
        <span className="absolute left-1 top-1 grid size-5 place-items-center rounded-full bg-white/85 text-[10px] font-medium text-ink-soft">
          {index + 1}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{item.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
              <span
                className="size-2 rounded-full border border-black/10"
                style={{ backgroundColor: item.colorHex }}
              />
              {COLOR_LABEL[item.color] ?? '多色'}
              <span>·</span>
              {CATEGORY_LABEL[item.category]}
              {item.material ? (
                <>
                  <span>·</span>
                  {item.material}
                </>
              ) : null}
              {item.brand ? (
                <>
                  <span>·</span>
                  {item.brand}
                </>
              ) : null}
            </p>
          </div>
          <span className="shrink-0 text-right text-xs font-medium text-ink">
            {item.price != null ? `¥${item.price}` : '—'}
          </span>
        </div>

        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">{item.reason}</p>

        <div className="mt-1.5 flex items-center justify-between">
          {item.isAiSuggested ? (
            <Badge tone="warning">
              <Sparkles className="size-2.5" />
              AI 建议 · 站内暂无
            </Badge>
          ) : (
            <span className="text-[10px] text-muted">来自站内衣橱</span>
          )}

          {item.purchaseUrl ? (
            <a
              href={item.purchaseUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-0.5 text-[10px] text-brand hover:underline"
            >
              看单品
              <ExternalLink className="size-2.5" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}
