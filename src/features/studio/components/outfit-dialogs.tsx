'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Share2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/primitives'
import { Switch } from '@/components/ui/switch'
import type { SavedOutfit } from '@/types/studio'

export function SaveOutfitDialog({
  open,
  onOpenChange,
  defaultTitle,
  saving,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTitle: string
  saving: boolean
  onConfirm: (title: string, isPublic: boolean) => void
}) {
  const [title, setTitle] = useState(defaultTitle)
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle)
      setIsPublic(false)
    }
  }, [open, defaultTitle])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>保存搭配方案</DialogTitle>
          <DialogDescription>方案会保存到「我的搭配」，之后可以继续编辑或分享。</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="outfit-title">方案名称</Label>
            <Input
              id="outfit-title"
              value={title}
              maxLength={60}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：海边约会 · 白裙"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line bg-paper px-3 py-3">
            <div className="pr-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                {isPublic ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                公开方案
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {isPublic
                  ? '其他人可在你的主页看到这套搭配；照片仍不会公开。'
                  : '仅自己可见，分享到讨论区时会单独发布帖子。'}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} aria-label="公开方案" />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={() => onConfirm(title.trim(), isPublic)} loading={saving} disabled={!title.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ShareToFeedDialog({
  open,
  onOpenChange,
  outfit,
  sharing,
  onConfirm,
  onSaveFirst,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  outfit: SavedOutfit | null
  sharing: boolean
  onConfirm: (title: string, body: string) => void
  onSaveFirst: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (open) {
      setTitle(outfit ? `${outfit.title}｜我的 AI 穿搭` : '我的 AI 穿搭')
      setBody('这套搭配是用 OOTD Lab 生成的，大家觉得怎么样？')
    }
  }, [open, outfit])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-brand" />
            分享到讨论区
          </DialogTitle>
          <DialogDescription>发布后会以帖子形式出现在讨论区，并关联这套搭配方案。</DialogDescription>
        </DialogHeader>

        {outfit ? (
          <DialogBody className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-paper p-2.5">
              {outfit.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={outfit.coverUrl} alt={outfit.title} className="h-16 w-12 rounded-lg object-cover" />
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{outfit.title}</p>
                <p className="mt-0.5 text-[11px] text-muted">{outfit.itemCount} 件单品</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-title">帖子标题</Label>
              <Input
                id="post-title"
                value={title}
                maxLength={80}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="post-body">正文</Label>
              <Textarea
                id="post-body"
                value={body}
                maxLength={5000}
                rows={5}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <p className="text-[11px] text-muted">发布后进入内容审核，通过后对所有人可见。</p>
          </DialogBody>
        ) : (
          <DialogBody className="space-y-3 py-2">
            <p className="text-sm text-ink-soft">分享前需要先把当前搭配保存为方案。</p>
            <Button onClick={onSaveFirst}>去保存方案</Button>
          </DialogBody>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sharing}>
            取消
          </Button>
          <Button
            onClick={() => onConfirm(title.trim(), body.trim())}
            disabled={!outfit || !title.trim() || !body.trim() || title.trim().length < 3}
            loading={sharing}
          >
            发布
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '确认',
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
