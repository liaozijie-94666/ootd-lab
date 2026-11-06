import type { Metadata } from 'next'
import { OutfitStudio } from '@/features/studio/components/studio-shell'

export const metadata: Metadata = {
  title: '自由搭配',
  description: '上传全身照，拖拽站内单品或自己的衣服，生成穿在你身上的穿搭效果图。',
}

export default function OutfitStudioPage() {
  return <OutfitStudio />
}
