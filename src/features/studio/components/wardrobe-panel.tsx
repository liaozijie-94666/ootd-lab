'use client'

import { useState } from 'react'
import { Plus, RefreshCw, Shirt } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { useQueryClient } from '@tanstack/react-query'
import { useClothing } from '../hooks'
import { useStudioStore } from '../store'
import { WardrobeFilters, type WardrobeFilterState } from './wardrobe-filters'
import { ClothingCard } from './clothing-card'
import { ClothingUploadDialog } from './clothing-upload-dialog'
import { MAX_LAYERS } from '@/lib/taxonomy'
import { cn } from '@/lib/utils'
import type { ClothingItem } from '@/types/studio'

type Tab = 'platform' | 'user'

export function WardrobePanel() {
  const [tab, setTab] = useState<Tab>('platform')
  const [filters, setFilters] = useState<WardrobeFilterState>({})
  const [uploadOpen, setUploadOpen] = useState(false)

  const layers = useStudioStore((state) => state.layers)
  const addClothing = useStudioStore((state) => state.addClothing)
  const setMobileTab = useStudioStore((state) => state.setMobileTab)
  const queryClient = useQueryClient()

  const query = useClothing({ source: tab, ...filters })
  const items = query.data?.items ?? []
  const full = layers.length >= MAX_LAYERS

  const handleAdd = (item: ClothingItem) => {
    if (full) {
      toast.error(`一套最多 ${MAX_LAYERS} 件，先删掉一件吧`)
      return
    }
    const added = addClothing(item)
    if (!added) {
      toast.error(`一套最多 ${MAX_LAYERS} 件`)
      return
    }
    toast.success(`已加入：${item.name}`, { duration: 1600 })
    setMobileTab('canvas')
  }

  const handleCreated = (item: ClothingItem) => {
    void queryClient.invalidateQueries({ queryKey: ['clothing'] })
    setTab('user')
    handleAdd(item)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-line px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg">衣橱</h2>
            <p className="mt-0.5 text-[11px] text-muted">点击衣服加入画布</p>
          </div>
          {tab === 'user' ? (
            <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
              <Plus className="size-3.5" />
              上传
            </Button>
          ) : null}
        </div>

        <div className="flex rounded-full bg-paper-deep p-1">
          {(
            [
              { key: 'platform', label: '站内衣服' },
              { key: 'user', label: '我的衣服' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                tab === item.key ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <WardrobeFilters value={filters} onChange={setFilters} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar p-3">
        {query.isPending ? (
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-sm text-ink-soft">衣橱加载失败</p>
            <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
              <RefreshCw className="size-3.5" />
              重试
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-paper-deep text-muted">
              <Shirt className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">
                {tab === 'user' ? '还没有自己的衣服' : '没有符合条件的单品'}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {tab === 'user'
                  ? '上传一张平铺图，自动去背景后就能搭配'
                  : '试试减少筛选条件，或切换到「我的衣服」'}
              </p>
            </div>
            {tab === 'user' ? (
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Plus className="size-3.5" />
                上传第一件
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setFilters({})}>
                清除筛选
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((item) => (
                <ClothingCard key={item.id} item={item} disabled={full} onAdd={() => handleAdd(item)} />
              ))}
            </div>
            <p className="pb-2 pt-4 text-center text-[10px] text-muted">
              共 {items.length} 件 · {tab === 'user' ? '仅你可见' : '站内精选'}
            </p>
          </>
        )}
      </div>

      <ClothingUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onCreated={handleCreated} />
    </div>
  )
}
