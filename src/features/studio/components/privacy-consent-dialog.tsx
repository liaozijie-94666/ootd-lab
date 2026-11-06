'use client'

import { useEffect, useState } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
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

interface PrivacyConsentDialogProps {
  open: boolean
  kind: 'body' | 'face'
  onOpenChange: (open: boolean) => void
  onAgree: () => void
}

export function PrivacyConsentDialog({ open, kind, onOpenChange, onAgree }: PrivacyConsentDialogProps) {
  const [checked, setChecked] = useState(false)
  const isFace = kind === 'face'

  useEffect(() => {
    if (open) setChecked(false)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            {isFace ? <Lock className="size-5" /> : <ShieldCheck className="size-5" />}
          </div>
          <DialogTitle>{isFace ? '人脸信息处理授权' : '照片使用说明'}</DialogTitle>
          <DialogDescription>
            {isFace
              ? '人脸属于敏感个人信息，需要你的单独同意后才能上传与使用。'
              : '你的照片仅用于生成穿搭效果，默认私密保存。'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3 text-sm leading-relaxed text-ink-soft">
          <ul className="space-y-2">
            <li>· 用途：仅用于生成「你本人」的穿搭效果图，不用于广告或模型训练。</li>
            <li>· 存储：AES-256-GCM 加密，私有存储，只有你能读取。</li>
            <li>· 可见性：默认不公开，不会出现在讨论区。</li>
            <li>· 保留：原图默认保留 180 天，可随时在「我的-隐私」中删除。</li>
            <li>· 撤回：撤回授权后立即停止使用，并删除已上传的人脸照片。</li>
          </ul>

          {isFace ? (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-paper p-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
                className="mt-0.5 size-4 accent-[var(--color-brand)]"
              />
              <span className="text-xs leading-relaxed text-ink-soft">
                我已阅读并同意《人脸信息处理规则》，同意为本次及后续搭配生成处理我的人脸照片。
              </span>
            </label>
          ) : (
            <p className="rounded-xl bg-paper p-3 text-xs text-muted">
              上传即表示你确认对照片拥有合法使用权。请勿上传他人照片。
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              onAgree()
            }}
            disabled={isFace && !checked}
          >
            {isFace ? '同意并上传' : '继续上传'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
