'use client'

import { Select } from '@/components/ui/select'
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  COLOR_HEX,
  COLOR_LABEL,
  COLOR_ORDER,
  SEASON_LABEL,
  SEASON_ORDER,
  STYLE_LABEL,
  STYLE_ORDER,
} from '@/lib/taxonomy'
import type { ClothingCategory, ClothingColor, ClothingSeason, ClothingStyle } from '@/types/studio'
import { cn } from '@/lib/utils'

export interface WardrobeFilterState {
  category?: ClothingCategory
  color?: ClothingColor
  style?: ClothingStyle
  season?: ClothingSeason
}

interface FilterProps {
  value: WardrobeFilterState
  onChange: (next: WardrobeFilterState) => void
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-[11px] transition-colors',
        active
          ? 'border-ink bg-ink text-white'
          : 'border-line bg-surface text-ink-soft hover:border-camel hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

export function WardrobeFilters({ value, onChange }: FilterProps) {
  const hasFilter = Boolean(value.category || value.color || value.style || value.season)

  return (
    <div className="space-y-2.5">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
        <Chip active={!value.category} onClick={() => onChange({ ...value, category: undefined })}>
          全部
        </Chip>
        {CATEGORY_ORDER.map((category) => (
          <Chip
            key={category}
            active={value.category === category}
            onClick={() =>
              onChange({ ...value, category: value.category === category ? undefined : category })
            }
          >
            {CATEGORY_LABEL[category]}
          </Chip>
        ))}
      </div>

      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <button
          type="button"
          aria-label="全部颜色"
          onClick={() => onChange({ ...value, color: undefined })}
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full border text-[9px] transition-colors',
            !value.color ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-muted',
          )}
        >
          全
        </button>
        {COLOR_ORDER.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={COLOR_LABEL[color]}
            title={COLOR_LABEL[color]}
            onClick={() => onChange({ ...value, color: value.color === color ? undefined : color })}
            className={cn(
              'size-6 shrink-0 rounded-full border transition-transform',
              value.color === color
                ? 'scale-110 border-ink ring-2 ring-ink/20 ring-offset-1'
                : 'border-black/10 hover:scale-105',
            )}
            style={{ backgroundColor: COLOR_HEX[color] }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto pb-0.5">
          {SEASON_ORDER.map((season) => (
            <Chip
              key={season}
              active={value.season === season}
              onClick={() => onChange({ ...value, season: value.season === season ? undefined : season })}
            >
              {SEASON_LABEL[season]}
            </Chip>
          ))}
        </div>
        <Select
          aria-label="风格筛选"
          value={value.style ?? ''}
          onChange={(event) =>
            onChange({ ...value, style: (event.target.value || undefined) as ClothingStyle | undefined })
          }
          wrapperClassName="w-[104px] shrink-0"
        >
          <option value="">全部风格</option>
          {STYLE_ORDER.map((style) => (
            <option key={style} value={style}>
              {STYLE_LABEL[style]}
            </option>
          ))}
        </Select>
      </div>

      {hasFilter ? (
        <button
          type="button"
          onClick={() => onChange({})}
          className="text-[11px] text-muted underline-offset-2 hover:text-brand hover:underline"
        >
          清除筛选
        </button>
      ) : null}
    </div>
  )
}
