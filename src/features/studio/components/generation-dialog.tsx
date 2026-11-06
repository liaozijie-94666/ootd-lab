'use client'

import { Download, RefreshCw, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/primitives'
import { GENERATION_STAGE_COPY } from '@/lib/taxonomy'
import { cn } from '@/lib/utils'
import { useStudioStore } from '../store'
import type { TryOnTask } from '@/types/studio'

interface GenerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: TryOnTask | undefined
  taskLoading: boolean
  onRegenerate: () => void
  onDownload: () => void
  onSave: () => void
}

export function GenerationDialog({
  open,
  onOpenChange,
  task,
  taskLoading,
  onRegenerate,
  onDownload,
  onSave,
}: GenerationDialogProps) {
  const layers = useStudioStore((state) => state.layers)
  const result = useStudioStore((state) => state.result)

  const status = task?.status ?? 'QUEUED'
  const progress = task?.progress ?? 0
  const finished = status === 'SUCCEEDED'
  const failed = status === 'FAILED' || status === 'CANCELED'
  const totalPrice = layers.reduce((sum, layer) => sum + (layer.clothing.price ?? 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{finished ? '生成完成' : failed ? '生成失败' : '正在生成'}</DialogTitle>
          <DialogDescription>
            {finished
              ? '这是 Mock 引擎合成的预览版效果图，可继续调整后重新生成。'
              : failed
                ? task?.error?.message ?? '生成过程出现问题，请重试'
                : '任务在后台异步执行，可以关闭弹窗稍后回来查看。'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-5 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="relative overflow-hidden rounded-2xl border border-line bg-paper-deep">
            <div className="relative aspect-[3/4] w-full">
              {finished && result ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.imageUrl}
                  alt="生成的穿搭效果图"
                  className="size-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="grid size-20 place-items-center rounded-full p-[5px]"
                      style={{
                        background: `conic-gradient(#b4552d ${Math.max(progress, 4)}%, #e9e2d8 0)`,
                      }}
                    >
                      <div className="grid size-full place-items-center rounded-full bg-surface">
                        <span className="text-sm font-semibold text-ink">{progress}%</span>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-ink-soft">
                      {GENERATION_STAGE_COPY[status] ?? '处理中'}
                    </p>
                    {failed ? (
                      <Button size="sm" variant="outline" onClick={onRegenerate}>
                        <RefreshCw className="size-3.5" />
                        重试
                      </Button>
                    ) : (
                      <p className="text-[11px] text-muted">通常需要 2–10 秒</p>
                    )}
                  </div>
                </div>
              )}

              {finished ? (
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <Badge tone="brand">AI 预览版</Badge>
                  <Badge>Mock 合成</Badge>
                </div>
              ) : null}
            </div>

            {finished && result ? (
              <div className="flex items-center justify-between border-t border-line bg-surface px-3 py-2">
                <span className="text-[11px] text-muted">
                  {result.width} × {result.height}
                </span>
                <Button size="sm" variant="ghost" onClick={onDownload}>
                  <Download className="size-3.5" />
                  下载
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink">所用单品</h3>
              <span className="text-[11px] text-muted">{layers.length} 件</span>
            </div>

            <ul className="mt-2 space-y-2">
              {layers.map((layer) => (
                <li
                  key={layer.id}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-surface p-2"
                >
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper-deep">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={layer.clothing.cutoutUrl}
                      alt={layer.clothing.name}
                      className="size-full object-contain"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-ink">
                      {layer.clothing.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                      <span
                        className="size-2 rounded-full border border-black/10"
                        style={{ backgroundColor: layer.clothing.colorHex }}
                      />
                      {layer.clothing.categoryLabel}
                      {layer.clothing.brand ? ` · ${layer.clothing.brand}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-soft">
                    {layer.clothing.price != null ? `¥${layer.clothing.price}` : '—'}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-paper px-3 py-2 text-xs">
              <span className="text-muted">合计参考价</span>
              <span className="font-medium text-ink">¥{totalPrice}</span>
            </div>

            {finished ? (
              <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-brand-soft/60 px-3 py-2 text-[11px] leading-relaxed text-brand-strong">
                <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                想更贴近真实效果？保存方案后可在下一模块接入真实虚拟试衣供应商。
              </div>
            ) : null}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button variant="outline" onClick={onRegenerate} loading={!finished && !failed && taskLoading}>
            <RefreshCw className="size-4" />
            重新生成
          </Button>
          <Button onClick={onSave} disabled={!finished} className={cn(!finished && 'opacity-100')}>
            保存方案
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
