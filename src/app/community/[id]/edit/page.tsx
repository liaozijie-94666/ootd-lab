'use client'

import { useParams } from 'next/navigation'
import { PostEditor } from '@/features/community/components/post-editor'

export default function CommunityEditPage() {
  const params = useParams<{ id: string }>()
  return <PostEditor postId={params.id} />
}
