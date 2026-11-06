'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Images, Shirt, Sparkles } from 'lucide-react'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { toast } from 'sonner'
import { ApiClientError, studioApi } from '../api'
import { useGenerationTask } from '../hooks'
import { useStudioStore } from '../store'
import { cn } from '@/lib/utils'
import { PhotoPanel } from './photo-panel'
import { OutfitCanvas } from './outfit-canvas'
import { WardrobePanel } from './wardrobe-panel'
import { ActionBar } from './action-bar'
import { GenerationDialog } from './generation-dialog'
import { ConfirmDialog, SaveOutfitDialog, ShareToFeedDialog } from './outfit-dialogs'
import type { OutfitLayer } from '@/types/studio'

export function OutfitStudio() {
  const bodyPhoto = useStudioStore((state) => state.bodyPhoto)
  const layers = useStudioStore((state) => state.layers)
  const draftId = useStudioStore((state) => state.draftId)
  const taskId = useStudioStore((state) => state.taskId)
  const result = useStudioStore((state) => state.result)
  const savedOutfit = useStudioStore((state) => state.savedOutfit)
  const mobileTab = useStudioStore((state) => state.mobileTab)
  const setMobileTab = useStudioStore((state) => state.setMobileTab)
  const setDraftId = useStudioStore((state) => state.setDraftId)
  const setTaskId = useStudioStore((state) => state.setTaskId)
  const setResult = useStudioStore((state) => state.setResult)
  const setSavedOutfit = useStudioStore((state) => state.setSavedOutfit)
  const clearLayers = useStudioStore((state) => state.clearLayers)

  const [genOpen, setGenOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [saveTitle, setSaveTitle] = useState('我的搭配')
  const [starting, setStarting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const failedTaskRef = useRef<string | null>(null)

  const taskQuery = useGenerationTask(taskId)
  const task = taskQuery.data

  const busy =
    starting ||
    Boolean(task && !['SUCCEEDED', 'FAILED', 'CANCELED'].includes(task.status))

  useEffect(() => {
    if (task?.status === 'SUCCEEDED' && task.result) {
      setResult(task.result)
    }
  }, [task, setResult])

  useEffect(() => {
    if (task?.status === 'FAILED' && failedTaskRef.current !== task.id) {
      failedTaskRef.current = task.id
      toast.error(task.error?.message ?? '生成失败，请重试')
    }
  }, [task])

  const toLayerPayload = (): OutfitLayer[] =>
    layers.map((layer) => ({
      id: layer.id,
      clothingId: layer.clothingId,
      x: layer.x,
      y: layer.y,
      scale: layer.scale,
      rotation: layer.rotation,
      zIndex: layer.zIndex,
    }))

  const startGeneration = async () => {
    if (!bodyPhoto) {
      toast.error('请先上传一张全身照')
      setMobileTab('photo')
      return
    }
    if (layers.length === 0) {
      toast.error('至少加入一件单品')
      return
    }

    setStarting(true)
    setGenOpen(true)
    setTaskId(null)
    setResult(null)

    try {
      const response = await studioApi.generateTryOn({
        userPhotoId: bodyPhoto.id,
        layers: toLayerPayload(),
        draftId,
        poseHint: 'standing',
      })
      setDraftId(response.draftId)
      setTaskId(response.taskId)
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '任务创建失败，请重试'
      toast.error(message)
      setGenOpen(false)
    } finally {
      setStarting(false)
    }
  }

  const handleDownload = async () => {
    const url = result?.imageUrl ?? savedOutfit?.resultUrl
    if (!url) {
      toast.error('还没有可下载的效果图')
      return
    }
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('download failed')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `ootd-${Date.now()}.jpg`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000)
      toast.success('已开始下载')
    } catch {
      toast.error('下载失败，请稍后重试')
    }
  }

  const handleSave = async (title: string, isPublic: boolean) => {
    if (!bodyPhoto) return
    try {
      setSaving(true)
      const { outfit } = await studioApi.saveOutfit({
        title,
        isPublic,
        userPhotoId: bodyPhoto.id,
        resultImageId: result?.imageId ?? null,
        draftId,
        layers: toLayerPayload(),
      })
      setSavedOutfit(outfit)
      setSaveOpen(false)
      toast.success('方案已保存', { description: isPublic ? '已设为公开' : '仅自己可见' })
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '保存失败，请重试'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async (title: string, body: string) => {
    if (!savedOutfit) return
    try {
      setSharing(true)
      await studioApi.sharePost({ title, body, outfitId: savedOutfit.id })
      setShareOpen(false)
      toast.success('已发布到讨论区', { description: '审核通过后会出现在信息流中' })
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : '发布失败，请重试'
      toast.error(message)
    } finally {
      setSharing(false)
    }
  }

  const openSaveDialog = () => {
    const today = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    setSaveTitle(`我的搭配 ${today}`)
    setSaveOpen(true)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      <header className="flex shrink-0 items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-display text-lg tracking-tight text-ink">
            OOTD Lab
          </Link>
          <span className="text-[11px] text-muted">/ 自由搭配</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <Link
            href="/ai-recommend"
            className="rounded-full border border-line px-2.5 py-1 transition-colors hover:border-camel hover:text-ink"
          >
            AI 推荐
          </Link>
          <Link
            href="/me/privacy"
            className="rounded-full border border-line px-2.5 py-1 transition-colors hover:border-camel hover:text-ink"
          >
            隐私
          </Link>
          <span className="hidden sm:inline">已登录</span>
          <SignOutButton />
          <span className="rounded-full bg-brand-soft px-2 py-1 font-medium text-brand-strong">
            Mock 试衣
          </span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside
          className={cn(
            'h-full min-h-0 overflow-hidden border-line bg-surface lg:block lg:border-r',
            mobileTab === 'photo' ? 'block' : 'hidden',
          )}
        >
          <PhotoPanel />
        </aside>

        <main
          className={cn(
            'h-full min-h-0 min-w-0 overflow-hidden bg-paper lg:block',
            mobileTab === 'canvas' ? 'block' : 'hidden',
          )}
        >
          <OutfitCanvas onRequestPhoto={() => setMobileTab('photo')} />
        </main>

        <aside
          className={cn(
            'h-full min-h-0 overflow-hidden border-line bg-surface lg:block lg:border-l',
            mobileTab === 'wardrobe' ? 'block' : 'hidden',
          )}
        >
          <WardrobePanel />
        </aside>
      </div>

      <ActionBar
        hasLayers={layers.length > 0}
        generating={busy}
        canGenerate={Boolean(bodyPhoto) && layers.length > 0 && !busy}
        canSave={Boolean(bodyPhoto) && layers.length > 0 && !saving}
        canDownload={Boolean(result || savedOutfit?.resultUrl)}
        canShare={Boolean(savedOutfit || result)}
        onGenerate={() => void startGeneration()}
        onSave={openSaveDialog}
        onDownload={() => void handleDownload()}
        onShare={() => setShareOpen(true)}
        onClear={() => setClearOpen(true)}
      />

      <nav className="safe-bottom grid shrink-0 grid-cols-3 border-t border-line bg-surface lg:hidden">
        {(
          [
            { key: 'photo', label: '照片', icon: Images },
            { key: 'canvas', label: '画布', icon: Sparkles },
            { key: 'wardrobe', label: '衣橱', icon: Shirt },
          ] as const
        ).map((item) => {
          const Icon = item.icon
          const active = mobileTab === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setMobileTab(item.key)}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors',
                active ? 'text-brand' : 'text-muted',
              )}
            >
              <Icon className="size-4" />
              {item.label}
              <span
                className={cn(
                  'h-0.5 w-5 rounded-full transition-colors',
                  active ? 'bg-brand' : 'bg-transparent',
                )}
              />
            </button>
          )
        })}
      </nav>

      <GenerationDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        task={task}
        taskLoading={starting}
        onRegenerate={() => void startGeneration()}
        onDownload={() => void handleDownload()}
        onSave={() => {
          setGenOpen(false)
          openSaveDialog()
        }}
      />

      <SaveOutfitDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultTitle={saveTitle}
        saving={saving}
        onConfirm={(title, isPublic) => void handleSave(title, isPublic)}
      />

      <ShareToFeedDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        outfit={savedOutfit}
        sharing={sharing}
        onConfirm={(title, body) => void handleShare(title, body)}
        onSaveFirst={() => {
          setShareOpen(false)
          openSaveDialog()
        }}
      />

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="清空画布？"
        description="会移除画布上的所有单品和当前生成结果，照片会保留。"
        confirmLabel="清空"
        onConfirm={() => {
          clearLayers()
          setTaskId(null)
          setResult(null)
          setSavedOutfit(null)
          setDraftId(null)
          toast.success('画布已清空')
        }}
      />
    </div>
  )
}
