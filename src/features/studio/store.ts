'use client'

import { create } from 'zustand'
import type {
  BodyCheck,
  ClothingItem,
  GenerationResult,
  LayerView,
  PhotoInfo,
  SavedOutfit,
} from '@/types/studio'
import { clamp } from '@/lib/utils'
import { DEFAULT_LAYER_TRANSFORM, MAX_LAYERS } from '@/lib/taxonomy'

export type MobileTab = 'photo' | 'canvas' | 'wardrobe'

interface StudioState {
  bodyPhoto: PhotoInfo | null
  facePhoto: PhotoInfo | null
  bodyCheck: BodyCheck | null
  layers: LayerView[]
  selectedId: string | null
  draftId: string | null
  taskId: string | null
  result: GenerationResult | null
  savedOutfit: SavedOutfit | null
  mobileTab: MobileTab
  sourceFiles: Partial<Record<'body' | 'face', File>>

  setBodyPhoto: (photo: PhotoInfo, bodyCheck: BodyCheck, file?: File) => void
  setFacePhoto: (photo: PhotoInfo, file?: File) => void
  removePhoto: (kind: 'body' | 'face') => void
  addClothing: (item: ClothingItem) => boolean
  removeLayer: (id: string) => void
  selectLayer: (id: string | null) => void
  updateLayer: (id: string, patch: Partial<Pick<LayerView, 'x' | 'y' | 'scale' | 'rotation' | 'zIndex'>>) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  clearLayers: () => void
  resetAll: () => void
  setDraftId: (id: string | null) => void
  setTaskId: (id: string | null) => void
  setResult: (result: GenerationResult | null) => void
  setSavedOutfit: (outfit: SavedOutfit | null) => void
  setMobileTab: (tab: MobileTab) => void
}

function nextZIndex(layers: LayerView[]) {
  return layers.reduce((max, layer) => Math.max(max, layer.zIndex), 0) + 1
}

function normalize(layers: LayerView[]): LayerView[] {
  const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex)
  return sorted.map((layer, index) => ({ ...layer, zIndex: index + 1 }))
}

export const useStudioStore = create<StudioState>((set, get) => ({
  bodyPhoto: null,
  facePhoto: null,
  bodyCheck: null,
  layers: [],
  selectedId: null,
  draftId: null,
  taskId: null,
  result: null,
  savedOutfit: null,
  mobileTab: 'photo',
  sourceFiles: {},

  setBodyPhoto: (photo, bodyCheck, file) =>
    set((state) => ({
      bodyPhoto: photo,
      bodyCheck,
      result: null,
      taskId: null,
      savedOutfit: null,
      sourceFiles: file ? { ...state.sourceFiles, body: file } : state.sourceFiles,
    })),

  setFacePhoto: (photo, file) =>
    set((state) => ({
      facePhoto: photo,
      sourceFiles: file ? { ...state.sourceFiles, face: file } : state.sourceFiles,
    })),

  removePhoto: (kind) =>
    set((state) => ({
      bodyPhoto: kind === 'body' ? null : state.bodyPhoto,
      bodyCheck: kind === 'body' ? null : state.bodyCheck,
      facePhoto: kind === 'face' ? null : state.facePhoto,
      layers: kind === 'body' ? [] : state.layers,
      result: kind === 'body' ? null : state.result,
      taskId: kind === 'body' ? null : state.taskId,
      savedOutfit: kind === 'body' ? null : state.savedOutfit,
      selectedId: null,
      sourceFiles: { ...state.sourceFiles, [kind]: undefined },
    })),

  addClothing: (item) => {
    const { layers } = get()
    if (layers.length >= MAX_LAYERS) return false

    const transform = DEFAULT_LAYER_TRANSFORM[item.category]
    const layer: LayerView = {
      id: `${item.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      clothingId: item.id,
      clothing: item,
      x: transform.x,
      y: transform.y,
      scale: transform.scale,
      rotation: 0,
      zIndex: nextZIndex(layers),
    }

    set({ layers: [...layers, layer], selectedId: layer.id, result: null })
    return true
  },

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((layer) => layer.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  selectLayer: (id) => set({ selectedId: id }),

  updateLayer: (id, patch) =>
    set((state) => ({
      layers: state.layers.map((layer) => {
        if (layer.id !== id) return layer
        const next = { ...layer, ...patch }
        if (patch.x != null) next.x = clamp(patch.x, 0.02, 0.98)
        if (patch.y != null) next.y = clamp(patch.y, 0.02, 0.98)
        if (patch.scale != null) next.scale = clamp(patch.scale, 0.06, 1.15)
        if (patch.rotation != null) {
          next.rotation = ((((patch.rotation + 180) % 360) + 360) % 360) - 180
        }
        return next
      }),
    })),

  bringToFront: (id) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, zIndex: nextZIndex(state.layers) } : layer,
      ),
    })),

  sendToBack: (id) =>
    set((state) => {
      const min = state.layers.reduce((acc, layer) => Math.min(acc, layer.zIndex), 100)
      const shifted = state.layers.map((layer) =>
        layer.id === id ? { ...layer, zIndex: min - 1 } : { ...layer, zIndex: layer.zIndex + 1 },
      )
      return { layers: normalize(shifted) }
    }),

  clearLayers: () => set({ layers: [], selectedId: null, result: null, savedOutfit: null }),

  resetAll: () =>
    set({
      bodyPhoto: null,
      facePhoto: null,
      bodyCheck: null,
      layers: [],
      selectedId: null,
      draftId: null,
      taskId: null,
      result: null,
      savedOutfit: null,
      sourceFiles: {},
    }),

  setDraftId: (id) => set({ draftId: id }),
  setTaskId: (id) => set({ taskId: id }),
  setResult: (result) => set({ result }),
  setSavedOutfit: (outfit) => set({ savedOutfit: outfit }),
  setMobileTab: (tab) => set({ mobileTab: tab }),
}))
