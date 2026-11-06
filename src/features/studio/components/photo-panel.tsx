'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Lock, Trash2, Upload, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge, Label } from '@/components/ui/primitives'
import { PrivacyConsentDialog } from './privacy-consent-dialog'
import { PhotoCropDialog } from './photo-crop-dialog'
import { useStudioStore } from '../store'
import { studioApi, ApiClientError } from '../api'

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

type PhotoKind = 'body' | 'face'

export function PhotoPanel() {
  const bodyPhoto = useStudioStore((state) => state.bodyPhoto)
  const facePhoto = useStudioStore((state) => state.facePhoto)
  const bodyCheck = useStudioStore((state) => state.bodyCheck)
  const sourceFiles = useStudioStore((state) => state.sourceFiles)
  const setBodyPhoto = useStudioStore((state) => state.setBodyPhoto)
  const setFacePhoto = useStudioStore((state) => state.setFacePhoto)
  const removePhoto = useStudioStore((state) => state.removePhoto)
  const setMobileTab = useStudioStore((state) => state.setMobileTab)

  const [consentKind, setConsentKind] = useState<PhotoKind | null>(null)
  const [pendingKind, setPendingKind] = useState<PhotoKind>('body')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [uploadingKind, setUploadingKind] = useState<PhotoKind | null>(null)
  const [dragging, setDragging] = useState(false)

  const bodyInput = useRef<HTMLInputElement>(null)
  const faceInput = useRef<HTMLInputElement>(null)

  const openPicker = (kind: PhotoKind) => {
    setPendingKind(kind)
    if (kind === 'body') bodyInput.current?.click()
    else faceInput.current?.click()
  }

  const validate = (file: File): boolean => {
    if (!ALLOWED.includes(file.type)) {
      toast.error('仅支持 JPG / PNG / WebP 格式')
      return false
    }
    if (file.size > MAX_BYTES) {
      toast.error('图片不能超过 4MB')
      return false
    }
    return true
  }

  const handleFiles = (files: FileList | null, kind: PhotoKind) => {
    const file = files?.[0]
    if (!file || !validate(file)) return
    setPendingKind(kind)
    setPendingFile(file)
    setCropOpen(true)
  }

  const handleUpload = async (blob: Blob) => {
    const kind = pendingKind
    setUploadingKind(kind)
    try {
      const result = await studioApi.uploadUserPhoto(blob, kind)
      if (kind === 'body') {
        setBodyPhoto(result.photo, result.bodyCheck, pendingFile ?? undefined)
        setMobileTab('canvas')
        if (result.bodyCheck.isFullBody) {
          toast.success('照片已就绪，开始挑衣服吧')
        } else {
          toast.warning(result.bodyCheck.message, { duration: 6000 })
        }
      } else {
        setFacePhoto(result.photo, pendingFile ?? undefined)
        toast.success('人脸照已加密保存')
      }
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '上传失败，请重试'
      toast.error(message)
    } finally {
      setUploadingKind(null)
    }
  }

  const handleDelete = async (kind: PhotoKind) => {
    const photo = kind === 'body' ? bodyPhoto : facePhoto
    if (!photo) return
    removePhoto(kind)
    try {
      await studioApi.deletePhoto(photo.id)
      toast.success(kind === 'body' ? '照片已删除' : '人脸照已删除')
    } catch {
      toast.warning('本地已移除，服务器清理稍后重试')
    }
  }

  const handleRecrop = (kind: PhotoKind) => {
    const file = sourceFiles[kind]
    if (!file) {
      openPicker(kind)
      return
    }
    setPendingKind(kind)
    setPendingFile(file)
    setCropOpen(true)
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto thin-scrollbar p-5">
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg">照片</h2>
          <span className="text-[11px] text-muted">第 1 步</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          全身照用于还原你的体型比例；人脸照可选，用于保留面部特征。
        </p>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>全身照</Label>
          {bodyPhoto ? (
            <Badge tone="success">已上传 · 加密</Badge>
          ) : (
            <Badge>必填</Badge>
          )}
        </div>

        {bodyPhoto ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="relative aspect-[3/4] w-full bg-paper-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bodyPhoto.url}
                alt="已上传的全身照"
                className="size-full object-cover"
              />
              {uploadingKind === 'body' ? (
                <div className="absolute inset-0 grid place-items-center bg-ink/40 text-xs text-white">
                  上传中…
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-line p-2.5">
              <div className="min-w-0 text-[11px] text-muted">
                {bodyCheck?.isFullBody ? '全身检测通过' : '非全身照，效果可能偏差'}
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => handleRecrop('body')}>
                  重新裁剪
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="删除全身照"
                  onClick={() => handleDelete('body')}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConsentKind('body')}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              handleFiles(event.dataTransfer.files, 'body')
            }}
            className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 transition-colors ${
              dragging
                ? 'border-brand bg-brand-soft/60'
                : 'border-line bg-paper-deep/40 hover:border-camel hover:bg-paper-deep'
            }`}
          >
            <span className="grid size-11 place-items-center rounded-full bg-surface text-brand shadow-soft">
              <ImagePlus className="size-5" />
            </span>
            <span className="text-sm font-medium text-ink">上传全身照</span>
            <span className="text-[11px] leading-relaxed text-muted">
              点击或拖拽 · JPG/PNG/WebP · ≤4MB
            </span>
          </button>
        )}

        {bodyCheck && !bodyCheck.isFullBody ? (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            {bodyCheck.message}
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>人脸照（可选）</Label>
          {facePhoto ? <Badge tone="brand">已加密</Badge> : <Badge>可选</Badge>}
        </div>

        {facePhoto ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={facePhoto.url}
              alt="已上传的人脸照"
              className="size-14 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink">面部特征已保留</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                <Lock className="size-3" /> 加密存储 · 默认私密
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="删除人脸照"
              onClick={() => handleDelete('face')}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConsentKind('face')}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line bg-paper-deep/30 px-3 py-3 text-left transition-colors hover:border-camel hover:bg-paper-deep"
          >
            <span className="grid size-9 place-items-center rounded-full bg-surface text-camel shadow-soft">
              <UserRound className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block text-xs font-medium text-ink">添加人脸照</span>
              <span className="block text-[11px] text-muted">需要单独授权，不用于训练</span>
            </span>
            <Upload className="size-4 text-muted" />
          </button>
        )}
      </section>

      <p className="mt-auto flex items-start gap-1.5 rounded-xl bg-paper-deep/60 p-3 text-[11px] leading-relaxed text-muted">
        <Lock className="mt-0.5 size-3 shrink-0" />
        照片使用 AES-256-GCM 加密存储，仅你本人可读取；可随时在「我的 · 隐私」中删除。
      </p>

      <input
        ref={bodyInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files, 'body')
          event.target.value = ''
        }}
      />
      <input
        ref={faceInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files, 'face')
          event.target.value = ''
        }}
      />

      <PrivacyConsentDialog
        open={consentKind !== null}
        kind={consentKind ?? 'body'}
        onOpenChange={(open) => {
          if (!open) setConsentKind(null)
        }}
        onAgree={() => {
          const kind = consentKind ?? 'body'
          setConsentKind(null)
          openPicker(kind)
        }}
      />

      <PhotoCropDialog
        file={pendingFile}
        open={cropOpen}
        aspect={pendingKind === 'body' ? 3 / 4 : 1}
        title={pendingKind === 'body' ? '裁剪全身照（3:4）' : '裁剪人脸照（1:1）'}
        onOpenChange={(open) => {
          setCropOpen(open)
          if (!open) setPendingFile(null)
        }}
        onConfirm={handleUpload}
      />
    </div>
  )
}
