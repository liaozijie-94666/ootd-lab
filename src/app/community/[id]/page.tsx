'use client'

import { useParams } from 'next/navigation'
import { PostDetail } from '@/features/community/components/post-detail'

export default function CommunityPostPage() {
  const params = useParams<{ id: string }>()
  return <PostDetail postId={params.id} />
}
