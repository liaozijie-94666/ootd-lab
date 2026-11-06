'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function TagInput({
  value,
  onChange,
  max = 5,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  max?: number
}) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const name = draft.trim().replace(/^#/, '').slice(0, 20)
    if (!name) return
    if (value.includes(name)) {
      setDraft('')
      return
    }
    if (value.length >= max) {
      toast.error(`最多添加 ${max} 个标签`)
      return
    }
    onChange([...value, name])
    setDraft('')
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-2 shadow-soft focus-within:border-brand">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand-strong"
          >
            #{tag}
            <button
              type="button"
              aria-label={`移除标签 ${tag}`}
              onClick={() => onChange(value.filter((item) => item !== tag))}
              className="text-brand-strong/70 hover:text-brand-strong"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
              event.preventDefault()
              commit()
            }
            if (event.key === 'Backspace' && !draft && value.length > 0) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={commit}
          placeholder={value.length === 0 ? '输入标签后回车，如：通勤、法式' : ''}
          className="h-6 min-w-[120px] flex-1 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
        />
      </div>
      <p className="mt-1.5 text-[10px] text-muted">最多 {max} 个 · 用于搜索与筛选</p>
    </div>
  )
}
