import type { Metadata } from 'next'
import { PostEditor } from '@/features/community/components/post-editor'

export const metadata: Metadata = {
  title: '发布穿搭',
}

export default function CommunityNewPage() {
  return <PostEditor />
}
