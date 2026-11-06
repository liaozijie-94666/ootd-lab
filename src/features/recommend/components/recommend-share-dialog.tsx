'use client'

import { useEffect, useState } from 'react'
import { Share2 } from 'lucide-react'
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
import { Label } from '@/components/ui/primitives'
import { Textarea } from '@/components/ui/textarea'

export function RecommendShareDialog({
  open,
  onOpenChange,
  defaultTitle,
  defaultBody,
  sharing,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTitle: string
  defaultBody: string
  sharing: boolean
  onConfirm: (title: string, body: string) => void
}) {
  const [title, setTitle] = useState(defaultTitle)
  const [body, setBody] = useState(defaultBody)

  useEffect(() => {
    if (!open) return
    setTitle(defaultTitle)
    setBody(defaultBody)
  }, [open, defaultTitle, defaultBody])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-brand" />
            分享这套推荐
          </DialogTitle>
          <DialogDescription>发布后会出现在讨论区，并关联这套 AI 推荐方案。</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rec-share-title">帖子标题</Label>
            <Input
              id="rec-share-title"
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-share-body">正文</Label>
            <Textarea
              id="rec-share-body"
              value={body}
              maxLength={5000}
              rows={5}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
          <p className="text-[11px] text-muted">发布后进入内容审核，通过后对所有人可见。</p>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sharing}>
            取消
          </Button>
          <Button
            onClick={() => onConfirm(title.trim(), body.trim())}
            loading={sharing}
            disabled={title.trim().length < 3 || body.trim().length === 0}
          >
            发布
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
