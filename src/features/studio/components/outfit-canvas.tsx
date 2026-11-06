'use client'

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { ArrowDownToLine, ArrowUpToLine, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStudioStore } from '../store'
import type { LayerView } from '@/types/studio'
import { Mannequin } from './mannequin'

type DragMode = 'move' | 'scale' | 'rotate'

interface DragState {
  mode: DragMode
  startX: number
  startY: number
  rect: DOMRect
  origin: { x: number; y: number; scale: number; rotation: number }
  centerX: number
  centerY: number
  startDist: number
  startAngle: number
}

function LayerNode({
  layer,
  selected,
  containerRef,
  onSelect,
}: {
  layer: LayerView
  selected: boolean
  containerRef: RefObject<HTMLDivElement | null>
  onSelect: () => void
}) {
  const updateLayer = useStudioStore((state) => state.updateLayer)
  const bringToFront = useStudioStore((state) => state.bringToFront)
  const drag = useRef<DragState | null>(null)

  const begin = (mode: DragMode) => (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation()
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    onSelect()
    const element = event.currentTarget
    element.setPointerCapture(event.pointerId)

    const centerX = rect.left + layer.x * rect.width
    const centerY = rect.top + layer.y * rect.height

    drag.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      origin: { x: layer.x, y: layer.y, scale: layer.scale, rotation: layer.rotation },
      centerX,
      centerY,
      startDist: Math.max(1, Math.hypot(event.clientX - centerX, event.clientY - centerY)),
      startAngle: (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) / Math.PI,
    }
  }

  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const state = drag.current
    if (!state) return

    if (state.mode === 'move') {
      const dx = (event.clientX - state.startX) / state.rect.width
      const dy = (event.clientY - state.startY) / state.rect.height
      updateLayer(layer.id, { x: state.origin.x + dx, y: state.origin.y + dy })
      return
    }

    if (state.mode === 'scale') {
      const dist = Math.hypot(event.clientX - state.centerX, event.clientY - state.centerY)
      updateLayer(layer.id, { scale: state.origin.scale * (dist / state.startDist) })
      return
    }

    const angle = (Math.atan2(event.clientY - state.centerY, event.clientX - state.centerX) * 180) / Math.PI
    updateLayer(layer.id, { rotation: state.origin.rotation + angle - state.startAngle })
  }

  const end = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      className={cn(
        'absolute touch-none select-none',
        selected ? 'cursor-grabbing' : 'cursor-grab',
      )}
      style={{
        left: `${layer.x * 100}%`,
        top: `${layer.y * 100}%`,
        width: `${layer.scale * 100}%`,
        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
        zIndex: layer.zIndex,
      }}
      onPointerDown={begin('move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={(event) => {
        event.stopPropagation()
        bringToFront(layer.id)
      }}
      role="img"
      aria-label={layer.clothing.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={layer.clothing.cutoutUrl}
        alt={layer.clothing.name}
        draggable={false}
        className="pointer-events-none w-full drop-shadow-[0_12px_20px_rgba(23,19,15,0.18)]"
      />

      {selected ? (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-brand/80" />
          <button
            type="button"
            aria-label="缩放"
            onPointerDown={begin('scale')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="absolute -bottom-2.5 -right-2.5 size-6 cursor-nwse-resize rounded-full border-2 border-white bg-brand shadow-lift"
          />
          <button
            type="button"
            aria-label="旋转"
            onPointerDown={begin('rotate')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="absolute -top-8 left-1/2 size-6 -translate-x-1/2 cursor-grab rounded-full border-2 border-brand bg-white shadow-lift"
          >
            <RotateCcw className="mx-auto size-3 text-brand" />
          </button>
        </>
      ) : null}
    </div>
  )
}

export function OutfitCanvas({ onRequestPhoto }: { onRequestPhoto: () => void }) {
  const bodyPhoto = useStudioStore((state) => state.bodyPhoto)
  const facePhoto = useStudioStore((state) => state.facePhoto)
  const layers = useStudioStore((state) => state.layers)
  const selectedId = useStudioStore((state) => state.selectedId)
  const selectLayer = useStudioStore((state) => state.selectLayer)
  const updateLayer = useStudioStore((state) => state.updateLayer)
  const removeLayer = useStudioStore((state) => state.removeLayer)
  const bringToFront = useStudioStore((state) => state.bringToFront)
  const sendToBack = useStudioStore((state) => state.sendToBack)
  const setMobileTab = useStudioStore((state) => state.setMobileTab)

  const containerRef = useRef<HTMLDivElement>(null)
  const selected = layers.find((layer) => layer.id === selectedId) ?? null

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (!selectedId) return
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeLayer(selectedId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, removeLayer])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between px-5 pt-4">
        <div>
          <h2 className="font-display text-lg">搭配画布</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            {layers.length === 0
              ? '从右侧衣橱挑一件，或上传自己的衣服'
              : '拖动移动 · 角标缩放 · 上方圆点旋转'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {facePhoto ? (
            <span className="rounded-full bg-brand-soft px-2 py-1 text-[10px] font-medium text-brand-strong">
              保留面部
            </span>
          ) : null}
          <span className="rounded-full bg-paper-deep px-2 py-1 text-[10px] text-muted">
            {layers.length}/8 件
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-3 thin-scrollbar sm:p-4">
        <div
          ref={containerRef}
          className="canvas-grid relative aspect-[3/4] w-full max-w-[500px] overflow-hidden rounded-[28px] border border-line bg-paper-deep shadow-soft"
          onPointerDown={() => selectLayer(null)}
        >
          {bodyPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bodyPhoto.url}
              alt="你的全身照"
              draggable={false}
              className="pointer-events-none absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <Mannequin className="h-[86%] opacity-90" />
            </div>
          )}

          {bodyPhoto ? (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/5" />
          ) : null}

          {layers.map((layer) => (
            <LayerNode
              key={layer.id}
              layer={layer}
              selected={layer.id === selectedId}
              containerRef={containerRef}
              onSelect={() => selectLayer(layer.id)}
            />
          ))}

          {!bodyPhoto ? (
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-paper/95 to-transparent px-4 pb-6 pt-10 text-center">
              <p className="text-sm font-medium text-ink">先上传一张全身照</p>
              <p className="text-[11px] text-muted">生成时才会把衣服穿到你的身上</p>
              <Button
                className="mt-2"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation()
                  onRequestPhoto()
                  setMobileTab('photo')
                }}
              >
                去上传
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
        {selected ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="max-w-[160px] truncate text-xs text-ink-soft">{selected.clothing.name}</span>
            <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label="置于顶层"
                onClick={() => bringToFront(selected.id)}
              >
                <ArrowUpToLine className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="置于底层"
                onClick={() => sendToBack(selected.id)}
              >
                <ArrowDownToLine className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="重置旋转"
                onClick={() => updateLayer(selected.id, { rotation: 0 })}
              >
                <RotateCcw className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="删除图层"
                onClick={() => removeLayer(selected.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-muted">
            {layers.length > 0 ? '点击画布上的衣服进行微调' : '画布支持拖拽、缩放与图层排序'}
          </span>
        )}
        <span className="hidden text-[11px] text-muted sm:block">Delete 删除 · 双击置顶</span>
      </div>
    </div>
  )
}
