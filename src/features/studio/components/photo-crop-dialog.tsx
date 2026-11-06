'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { RotateCw } from 'lucide-react'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cropImage, revokeObjectUrl, rotateImage90 } from '../lib/image'

interface PhotoCropDialogProps {
  file: File | null
  aspect: number
  open: boolean
  title?: string
  onOpenChange: (open: boolean) => void
  onConfirm: (blob: Blob) => Promise<void> | void
}

export function PhotoCropDialog({
  file,
  aspect,
  open,
  title = '裁剪照片',
  onOpenChange,
  onConfirm,
}: PhotoCropDialogProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPixels, setAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!file) return
    const next = URL.createObjectURL(file)
    revokeObjectUrl(urlRef.current)
    urlRef.current = next
    setUrl(next)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setAreaPixels(null)
    return () => {
      revokeObjectUrl(next)
      if (urlRef.current === next) urlRef.current = null
    }
  }, [file])

  const handleRotate = useCallback(async () => {
    if (!url) return
    try {
      setBusy(true)
      const rotated = await rotateImage90(url)
      const next = URL.createObjectURL(rotated)
      revokeObjectUrl(url)
      urlRef.current = next
      setUrl(next)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setAreaPixels(null)
    } finally {
      setBusy(false)
    }
  }, [url])

  const handleConfirm = async () => {
    if (!url || !areaPixels) return
    try {
      setBusy(true)
      const blob = await cropImage(url, areaPixels)
      await onConfirm(blob)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="relative h-[300px] overflow-hidden rounded-2xl bg-ink sm:h-[360px]">
            {url ? (
              <Cropper
                image={url}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, pixels) => setAreaPixels(pixels)}
                objectFit="contain"
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-white/60">加载中…</div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="w-10 text-xs text-muted">缩放</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={(value) => setZoom(value[0] ?? 1)}
              aria-label="缩放"
            />
            <Button variant="outline" size="sm" onClick={handleRotate} disabled={busy || !url}>
              <RotateCw className="size-3.5" />
              旋转 90°
            </Button>
          </div>

          <p className="text-xs text-muted">
            {aspect === 1
              ? '建议使用正脸、光线均匀的照片，仅用于保留面部特征。'
              : '建议全身入镜、脚部完整，比例 3:4 效果最好。'}
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} loading={busy} disabled={!areaPixels}>
            使用这张照片
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
