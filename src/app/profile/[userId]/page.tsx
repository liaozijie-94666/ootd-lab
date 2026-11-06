'use client'

import { useParams } from 'next/navigation'
import { ProfileView } from '@/features/community/components/profile-view'

export default function ProfilePage() {
  const params = useParams<{ userId: string }>()
  return <ProfileView userId={params.userId} />
}
