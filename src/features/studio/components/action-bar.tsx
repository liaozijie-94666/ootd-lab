'use client'

import { BookmarkPlus, Download, Share2, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ActionBarProps {
  hasLayers: boolean
  generating: boolean
  canGenerate: boolean
  canSave: boolean
  canDownload: boolean
  canShare: boolean
  onGenerate: () => void
  onSave: () => void
  onDownload: () => void
  onShare: () => void
  onClear: () => void
}

export function ActionBar({
  hasLayers,
  generating,
  canGenerate,
  canSave,
  canDownload,
  canShare,
  onGenerate,
  onSave,
  onDownload,
  onShare,
  onClear,
}: ActionBarProps) {
  return (
    <div className="safe-bottom border-t border-line bg-surface/95 px-3 py-2.5 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center gap-1.5 sm:gap-2">
        <span className="mr-auto hidden text-[11px] text-muted xl:block">
          生成使用 Mock 试衣引擎，输出带「AI 预览」水印，仅用于搭配预览。
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!hasLayers}
          aria-label="清空画布"
        >
          <Trash2 className="size-4" />
          <span className="hidden sm:inline">清空</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          disabled={!canDownload}
          aria-label="下载效果图"
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">下载</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          disabled={!canShare}
          aria-label="分享到讨论区"
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">分享</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!canSave}
          aria-label="保存方案"
        >
          <BookmarkPlus className="size-4" />
          <span className="hidden sm:inline">保存方案</span>
        </Button>
        <Button
          size="md"
          className="ml-1 shrink-0 px-4 sm:px-5"
          onClick={onGenerate}
          disabled={!canGenerate}
          loading={generating}
        >
          <Sparkles className="size-4" />
          {generating ? '生成中…' : '生成效果图'}
        </Button>
      </div>
    </div>
  )
}
