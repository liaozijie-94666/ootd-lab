'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
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
import { Label } from '@/components/ui/primitives'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { communityApi } from '../api'
import { ApiClientError } from '@/lib/api-client'

const REASONS = [
  { value: 'SPAM', label: '广告引流 / 垃圾信息' },
  { value: 'SEXUAL', label: '色情低俗' },
  { value: 'ILLEGAL', label: '违法违规' },
  { value: 'VIOLENCE', label: '血腥暴力' },
  { value: 'COPYRIGHT', label: '侵权盗图' },
  { value: 'HARASSMENT', label: '人身攻击' },
  { value: 'OTHER', label: '其他' },
]

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: 'POST' | 'COMMENT' | 'USER'
  targetId: string
}) {
  const [reason, setReason] = useState('SPAM')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    try {
      setSubmitting(true)
      await communityApi.report({ targetType, targetId, reason, detail: detail.trim() || undefined })
      toast.success('举报已提交，我们会尽快处理')
      onOpenChange(false)
      setDetail('')
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'ALREADY_REPORTED') {
        toast.info(error.message)
        onOpenChange(false)
        return
      }
      toast.error(error instanceof ApiClientError ? error.message : '举报失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="size-4 text-brand" />
            举报内容
          </DialogTitle>
          <DialogDescription>请选择原因并补充说明，恶意举报会被记录。</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label>举报原因</Label>
            <Select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-10 w-full rounded-xl text-sm"
            >
              {REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-detail">补充说明（可选）</Label>
            <Textarea
              id="report-detail"
              value={detail}
              maxLength={500}
              rows={3}
              placeholder="描述具体问题，方便我们核实"
              onChange={(event) => setDetail(event.target.value)}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={submit} loading={submitting}>
            提交举报
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
