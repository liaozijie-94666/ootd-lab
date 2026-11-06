'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flag,
  Heart,
  Pencil,
  Sparkles,
  Trash2,
  UserPlus,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/primitives'
import { ApiClientError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { CommunityPostDetail } from '@/types/community'
import { communityApi } from '../api'
import { CommunityHeader } from './community-header'
import { CommentSection } from './comment-section'
import { ReportDialog } from './report-dialog'

export function PostDetail({ postId }: { postId: string }) {
  const router = useRouter()
  const [post, setPost] = useState<CommunityPostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slide, setSlide] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)
  const [busy, setBusy] = useState<'like' | 'favorite' | 'follow' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await communityApi.get(postId)
      setPost(data.post)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : '帖子加载失败')
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    void load()
  }, [load])

  const like = async () => {
    if (!post || busy) return
    setBusy('like')
    try {
      const result = await communityApi.like(post.id)
      setPost({ ...post, liked: result.liked, likeCount: result.likeCount })
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  const favorite = async () => {
    if (!post || busy) return
    setBusy('favorite')
    try {
      const result = await communityApi.favorite(post.id)
      setPost({ ...post, favorited: result.favorited, bookmarkCount: result.bookmarkCount })
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  const follow = async () => {
    if (!post || busy) return
    setBusy('follow')
    try {
      const result = await communityApi.follow(post.author.id)
      setPost({ ...post, followingAuthor: result.following })
      toast.success(result.following ? '已关注' : '已取消关注')
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '操作失败')
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!post || !window.confirm('删除这篇帖子？删除后不可恢复。')) return
    try {
      await communityApi.remove(post.id)
      toast.success('帖子已删除')
      router.push('/community')
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '删除失败')
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-paper">
        <CommunityHeader />
        <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
          <div className="h-8 w-1/2 animate-pulse rounded bg-line/60" />
          <div className="aspect-[16/10] w-full animate-pulse rounded-2xl bg-line/60" />
          <div className="h-4 w-full animate-pulse rounded bg-line/60" />
        </main>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-dvh bg-paper">
        <CommunityHeader />
        <div className="grid min-h-[60vh] place-items-center px-4 text-center">
          <div>
            <p className="font-display text-xl">帖子暂时看不到</p>
            <p className="mt-1 text-xs text-muted">{error ?? '它可能已被删除或下架'}</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/community">回到讨论区</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const images =
    post.images.length > 0
      ? post.images
      : post.coverUrl
        ? [{ id: 'cover', url: post.coverUrl, width: null, height: null }]
        : []
  const current = images[Math.min(slide, images.length - 1)]

  const clothing = post.recommendation
    ? {
        title: post.recommendation.styleSummary,
        items: post.recommendation.items,
        kind: 'recommendation' as const,
        reason: post.recommendation.reason,
      }
    : post.outfit
      ? { title: post.outfit.title, items: post.outfit.items, kind: 'outfit' as const }
      : null

  return (
    <div className="min-h-dvh bg-paper">
      <CommunityHeader />

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Link
          href="/community"
          className="mb-3 inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
        >
          <ArrowLeft className="size-3" />
          返回讨论区
        </Link>

        {post.status === 'PENDING_REVIEW' ? (
          <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            这篇帖子正在审核，仅你本人可见；通过后会自动公开。
          </div>
        ) : null}
        {post.status === 'REMOVED' ? (
          <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-700">
            帖子已被管理员下架，仅你本人可见。
          </div>
        ) : null}

        <div
          className={cn(
            'grid gap-5',
            images.length > 0 && 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]',
          )}
        >
          <div className="space-y-3">
            <div
              className={cn(
                'relative overflow-hidden rounded-2xl border border-line bg-paper-deep',
                images.length > 0 ? 'aspect-[4/5]' : 'h-20',
              )}
            >
              {current ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.url} alt={post.title} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-xs text-muted">暂无配图</div>
              )}

              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="上一张"
                    onClick={() => setSlide((value) => (value - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-white backdrop-blur transition hover:bg-ink/70"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="下一张"
                    onClick={() => setSlide((value) => (value + 1) % images.length)}
                    className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-white backdrop-blur transition hover:bg-ink/70"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        aria-label={`第 ${index + 1} 张`}
                        onClick={() => setSlide(index)}
                        className={cn(
                          'size-1.5 rounded-full transition-all',
                          index === slide ? 'w-4 bg-white' : 'bg-white/50',
                        )}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={post.liked ? 'default' : 'outline'}
                size="sm"
                onClick={() => void like()}
                loading={busy === 'like'}
                className="flex-1"
              >
                <Heart className={cn('size-4', post.liked && 'fill-white')} />
                {post.liked ? '已赞' : '点赞'} {post.likeCount}
              </Button>
              <Button
                variant={post.favorited ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => void favorite()}
                loading={busy === 'favorite'}
                className="flex-1"
              >
                <Bookmark className={cn('size-4', post.favorited && 'fill-white')} />
                {post.favorited ? '已收藏' : '收藏'}
              </Button>
              <Button variant="ghost" size="icon" aria-label="举报" onClick={() => setReportOpen(true)}>
                <Flag className="size-4" />
              </Button>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Link key={tag.id} href={`/community?tag=${encodeURIComponent(tag.name)}`}>
                  <Badge tone="neutral">#{tag.name}</Badge>
                </Link>
              ))}
            </div>

            <h1 className="mt-2 font-display text-2xl leading-snug sm:text-3xl">{post.title}</h1>

            <div className="mt-3 flex items-center gap-2.5">
              {post.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.name}
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-xs font-medium text-brand-strong">
                  {post.author.name.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profile/${post.author.id}`}
                  className="block truncate text-xs font-medium text-ink hover:underline"
                >
                  {post.author.name}
                </Link>
                <p className="text-[10px] text-muted">
                  {new Date(post.createdAt).toLocaleDateString('zh-CN')} · @{post.author.handle}
                </p>
              </div>

              {!post.isAuthor ? (
                <Button
                  variant={post.followingAuthor ? 'outline' : 'subtle'}
                  size="sm"
                  onClick={() => void follow()}
                  loading={busy === 'follow'}
                >
                  {post.followingAuthor ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
                  {post.followingAuthor ? '已关注' : '关注'}
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/community/${post.id}/edit`}>
                      <Pencil className="size-3.5" />
                      编辑
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="删除帖子" onClick={() => void remove()}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            <p className="mt-4 whitespace-pre-wrap text-[14px] leading-7 text-ink-soft">{post.content}</p>

            {clothing ? (
              <section className="mt-5 rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center gap-1.5">
                  {clothing.kind === 'recommendation' ? (
                    <Sparkles className="size-4 text-brand" />
                  ) : null}
                  <h2 className="text-sm font-medium text-ink">
                    {clothing.kind === 'recommendation' ? 'AI 推荐方案' : '关联搭配'}
                  </h2>
                  <span className="text-[10px] text-muted">{clothing.title}</span>
                </div>
                {'reason' in clothing && clothing.reason ? (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{clothing.reason}</p>
                ) : null}

                <ul className="mt-3 space-y-2">
                  {clothing.items.map((item, index) => (
                    <li
                      key={`${item.name}-${index}`}
                      className="flex items-center gap-2.5 rounded-xl bg-paper/70 p-2"
                    >
                      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper-deep">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="size-full object-contain" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-ink">{item.name}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                          <span
                            className="size-2 rounded-full border border-black/10"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          {item.categoryLabel}
                          {item.brand ? ` · ${item.brand}` : ''}
                          {item.material ? ` · ${item.material}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-ink-soft">
                        {item.price != null ? `¥${item.price}` : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="mt-5">
              <CommentSection postId={post.id} canModerate={post.isAuthor} />
            </div>
          </div>
        </div>
      </main>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="POST"
        targetId={post.id}
      />
    </div>
  )
}
