'use client'

import Link from 'next/link'
import { Bookmark, Heart, ImageIcon, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/primitives'
import { formatRelativeTime } from '@/lib/utils'
import type { CommunityPostCard } from '@/types/community'

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="size-6 rounded-full object-cover" />
  }
  return (
    <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[10px] font-medium text-brand-strong">
      {name.slice(0, 1)}
    </span>
  )
}

export function PostCard({ post }: { post: CommunityPostCard }) {
  const pending = post.status === 'PENDING_REVIEW'
  const removed = post.status === 'REMOVED'

  return (
    <Link
      href={`/community/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#f4ecdf,#e6dac8)]">
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverUrl}
            alt={post.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid size-full place-items-center text-camel/70">
            <ImageIcon className="size-8" />
          </span>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {pending ? <Badge tone="warning">审核中</Badge> : null}
          {removed ? <Badge tone="warning">已下架</Badge> : null}
          {post.tags[0] ? <Badge tone="brand">#{post.tags[0].name}</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-6 text-ink">{post.title}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{post.excerpt}</p>

        <div className="mt-3 flex items-center gap-2">
          <Avatar name={post.author.name} url={post.author.avatarUrl} />
          <span className="truncate text-[11px] text-ink-soft">{post.author.name}</span>
          <span className="text-[10px] text-muted">· {formatRelativeTime(post.createdAt)}</span>
        </div>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <Heart className={post.liked ? 'size-3.5 fill-brand text-brand' : 'size-3.5'} />
            {post.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3.5" />
            {post.commentCount}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className={post.favorited ? 'size-3.5 fill-camel text-camel' : 'size-3.5'} />
            {post.bookmarkCount}
          </span>
        </div>
      </div>
    </Link>
  )
}
