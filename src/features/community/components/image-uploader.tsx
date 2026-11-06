'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api-client'
import { communityApi } from '../api'

export interface UploadedImage {
  id: string
  url: string
}

export function ImageUploader({
  value,
  onChange,
  max = 9,
}: {
  value: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  max?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return

    if (value.length + list.length > max) {
      toast.error(`最多上传 ${max} 张图片`)
      return
    }

    for (const file of list) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`「${file.name}」格式不支持，仅限 JPG/PNG/WebP`)
        return
      }
      if (file.size > 4 * 1024 * 1024) {
        toast.error(`「${file.name}」超过 4MB`)
        return
      }
    }

    try {
      setUploading(true)
      const { images } = await communityApi.uploadImages(list)
      onChange([...value, ...images].slice(0, max))
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : '图片上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((image, index) => (
          <div
            key={image.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-paper-deep"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={`配图 ${index + 1}`} className="size-full object-cover" />
            {index === 0 ? (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/65 px-1.5 py-0.5 text-[9px] text-white">
                封面
              </span>
            ) : null}
            <button
              type="button"
              aria-label={`移除第 ${index + 1} 张图片`}
              onClick={() => onChange(value.filter((item) => item.id !== image.id))}
              className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-ink/65 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {value.length < max ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              void upload(event.dataTransfer.files)
            }}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-paper/50 text-muted transition-colors hover:border-camel hover:text-ink-soft disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            <span className="text-[10px]">{uploading ? '上传中' : `${value.length}/${max}`}</span>
          </button>
        ) : null}
      </div>

      <p className="mt-1.5 text-[10px] text-muted">第一张为封面 · 单张 ≤4MB · 最多 {max} 张</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) void upload(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
