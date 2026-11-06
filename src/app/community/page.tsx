import type { Metadata } from 'next'
import { CommunityFeed } from '@/features/community/components/community-feed'

export const metadata: Metadata = {
  title: '讨论区',
  description: '分享穿搭方案、讨论场景搭配，也可以直接提问「这套怎么改」。',
}

export default function CommunityPage() {
  return <CommunityFeed />
}
