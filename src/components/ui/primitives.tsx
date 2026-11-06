'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-xs font-medium tracking-wide text-ink-soft', className)}
      {...props}
    />
  )
}

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-xl bg-line/60', className)} {...props} />
}

function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'brand' | 'success' | 'warning' }) {
  const tones = {
    neutral: 'bg-paper-deep text-ink-soft',
    brand: 'bg-brand-soft text-brand-strong',
    success: 'bg-success/10 text-success',
    warning: 'bg-amber-100 text-amber-800',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

export { Label, Skeleton, Badge }
