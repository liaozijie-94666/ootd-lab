import type { Metadata } from 'next'
import { RecommendShell } from '@/features/recommend/components/recommend-shell'

export const metadata: Metadata = {
  title: 'AI 推荐',
  description: '输入场景、身材与预算，AI 从站内衣橱组合一套穿搭，并生成效果图与搭配理由。',
}

export default function AiRecommendPage() {
  return <RecommendShell />
}
