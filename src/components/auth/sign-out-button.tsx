'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-[11px] text-muted"
      onClick={() => void signOut({ callbackUrl: '/login' })}
    >
      <LogOut className="size-3.5" />
      {compact ? null : '退出'}
    </Button>
  )
}
