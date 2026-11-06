'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { Select } from '@/components/ui/select'
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  COLOR_LABEL,
  COLOR_ORDER,
  SEASON_LABEL,
  SEASON_ORDER,
  STYLE_LABEL,
  STYLE_ORDER,
} from '@/lib/taxonomy'
import type {
  ClothingCategory,
  ClothingColor,
  ClothingItem,
  ClothingSeason,
  ClothingStyle,
} from '@/types/studio'
import { ApiClientError, studioApi } from '../api'

interface ClothingUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: ClothingItem) => void
}

export function ClothingUploadDialog({ open, onOpenChange, onCreated }: ClothingUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ClothingCategory>('TOP')
  const [color, setColor] = useState<ClothingColor>('WHITE')
  const [style, setStyle] = useState<ClothingStyle>('CASUAL')
  const [season, setSeason] = useState<ClothingSeason>('ALL_SEASON')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [material, setMaterial] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setPreview(null)
      setName('')
      setBrand('')
      setPrice('')
      setMaterial('')
      setSubmitting(false)
    }
  }, [open])

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handlePick = (files: FileList | null) => {
    const picked = files?.[0]
    if (!picked) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(picked.type)) {
      toast.error('仅支持 JPG / PNG / WebP')
      return
    }
    if (picked.size > 4 * 1024 * 1024) {
      toast.error('图片不能超过 4MB')
      return
    }
    setFile(picked)
  }

  const handleSubmit = async () => {
    if (!file) {
      toast.error('请先上传衣服图片')
      return
    }
    if (!name.trim()) {
      toast.error('给这件衣服起个名字吧')
      return
    }

    const form = new FormData()
    form.set('file', file, file.name || `clothing-${Date.now()}.jpg`)
    form.set('name', name.trim())
    form.set('category', category)
    form.set('color', color)
    form.set('style', style)
    form.set('season', season)
    if (brand.trim()) form.set('brand', brand.trim())
    if (price.trim()) form.set('price', price.trim())
    if (material.trim()) form.set('material', material.trim())

    try {
      setSubmitting(true)
      const { item } = await studioApi.uploadClothing(form)
      toast.success('已加入「我的衣服」')
      onCreated(item)
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '上传失败，请重试'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>上传我的衣服</DialogTitle>
          <DialogDescription>
            平铺或挂拍图效果最好。我们会自动去背景生成透明 PNG，约需 1–3 秒。
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              handlePick(event.dataTransfer.files)
            }}
            className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-paper-deep/40 transition-colors hover:border-camel"
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="衣服预览" className="size-full object-contain p-3" />
                <span className="absolute bottom-2 right-2 rounded-full bg-ink/60 px-2 py-1 text-[10px] text-white">
                  点击更换
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-2 text-muted">
                <ImagePlus className="size-6" />
                <span className="text-xs">点击或拖拽上传衣服图片</span>
                <span className="text-[10px]">JPG / PNG / WebP · ≤4MB</span>
              </span>
            )}
          </button>

          <div className="space-y-1.5">
            <Label htmlFor="clothing-name">名称</Label>
            <Input
              id="clothing-name"
              value={name}
              maxLength={40}
              placeholder="例如：我的白衬衫"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>类别</Label>
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value as ClothingCategory)}
                className="h-10 w-full rounded-xl text-sm"
              >
                {CATEGORY_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {CATEGORY_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>颜色</Label>
              <Select
                value={color}
                onChange={(event) => setColor(event.target.value as ClothingColor)}
                className="h-10 w-full rounded-xl text-sm"
              >
                {COLOR_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {COLOR_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>风格</Label>
              <Select
                value={style}
                onChange={(event) => setStyle(event.target.value as ClothingStyle)}
                className="h-10 w-full rounded-xl text-sm"
              >
                {STYLE_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {STYLE_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>季节</Label>
              <Select
                value={season}
                onChange={(event) => setSeason(event.target.value as ClothingSeason)}
                className="h-10 w-full rounded-xl text-sm"
              >
                {SEASON_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {SEASON_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="clothing-brand">品牌</Label>
              <Input
                id="clothing-brand"
                value={brand}
                maxLength={40}
                placeholder="可选"
                onChange={(event) => setBrand(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clothing-price">价格（元）</Label>
              <Input
                id="clothing-price"
                value={price}
                inputMode="decimal"
                placeholder="可选"
                onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ''))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clothing-material">材质</Label>
              <Input
                id="clothing-material"
                value={material}
                maxLength={60}
                placeholder="可选"
                onChange={(event) => setMaterial(event.target.value)}
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} loading={submitting}>
            {submitting ? '正在去背景…' : '保存到我的衣橱'}
          </Button>
        </DialogFooter>

        {submitting ? (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-surface/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 className="size-4 animate-spin" />
              正在抠图并保存…
            </div>
          </div>
        ) : null}
      </DialogContent>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          handlePick(event.target.files)
          event.target.value = ''
        }}
      />
    </Dialog>
  )
}
