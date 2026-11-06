'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignOutButton } from '@/components/auth/sign-out-button'

export function CommunityHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/community" className="font-display text-lg tracking-tight">
          OOTD Lab
        </Link>
        <span className="hidden text-[11px] text-muted sm:inline">/ 讨论区</span>

        <nav className="ml-auto hidden items-center gap-1 text-[12px] text-muted md:flex">
          <Link href="/community" className="rounded-full px-3 py-1.5 hover:bg-paper-deep hover:text-ink">
            讨论区
          </Link>
          <Link
            href="/outfit-studio"
            className="rounded-full px-3 py-1.5 hover:bg-paper-deep hover:text-ink"
          >
            自由搭配
          </Link>
          <Link
            href="/ai-recommend"
            className="rounded-full px-3 py-1.5 hover:bg-paper-deep hover:text-ink"
          >
            AI 推荐
          </Link>
        </nav>

        {right ?? (
          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <SignOutButton compact />
            <Button asChild size="sm">
              <Link href="/community/new">
                <PenLine className="size-3.5" />
                发布
              </Link>
            </Button>
          </div>
        )}
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-4 py-1.5 text-[11px] text-muted md:hidden">
        <Link href="/community" className="shrink-0 rounded-full px-2.5 py-1 hover:bg-paper-deep">
          讨论区
        </Link>
        <Link href="/outfit-studio" className="shrink-0 rounded-full px-2.5 py-1 hover:bg-paper-deep">
          自由搭配
        </Link>
        <Link href="/ai-recommend" className="shrink-0 rounded-full px-2.5 py-1 hover:bg-paper-deep">
          AI 推荐
        </Link>
      </nav>
    </header>
  )
}
