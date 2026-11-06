'use client'

import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/primitives'
import type { ClothingItem } from '@/types/studio'
import { cn } from '@/lib/utils'

export function ClothingCard({
  item,
  disabled,
  onAdd,
}: {
  item: ClothingItem
  disabled?: boolean
  onAdd: () => void
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      aria-label={`将 ${item.name} 加入搭配`}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-soft transition-all',
        'hover:-translate-y-0.5 hover:border-camel/70 hover:shadow-lift',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#f7f2ea,#ece4d8)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          draggable={false}
          className="absolute inset-0 size-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-brand opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
          <Plus className="size-4" />
        </span>
        {item.source === 'USER_UPLOAD' ? (
          <span className="absolute left-2 top-2">
            <Badge tone="brand">我的</Badge>
          </span>
        ) : null}
      </div>

      <div className="space-y-1 p-2.5">
        <p className="truncate text-[12px] font-medium leading-5 text-ink">{item.name}</p>
        <div className="flex items-center justify-between text-[10px] text-muted">
          <span className="flex min-w-0 items-center gap-1">
            <span
              className="size-2 shrink-0 rounded-full border border-black/10"
              style={{ backgroundColor: item.colorHex }}
            />
            <span className="truncate">{item.color === 'MULTI' ? '多色' : item.brand ?? item.categoryLabel}</span>
          </span>
          <span className="shrink-0 font-medium text-ink-soft">
            {item.price != null ? `¥${item.price}` : '—'}
          </span>
        </div>
      </div>
    </button>
  )
}
