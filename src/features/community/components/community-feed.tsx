'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, PenLine, RefreshCw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ApiClientError } from '@/lib/api-client'
import type { CommunityPostCard } from '@/types/community'
import { communityApi } from '../api'
import { CommunityHeader } from './community-header'
import { PostCard } from './post-card'

type Sort = 'latest' | 'hot' | 'following'

const SORTS: Array<{ key: Sort; label: string }> = [
  { key: 'latest', label: '最新' },
  { key: 'hot', label: '热门' },
  { key: 'following', label: '关注' },
]

export function CommunityFeed() {
  const [sort, setSort] = useState<Sort>('latest')
  const [tag, setTag] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [query, setQuery] = useState('')

  const [items, setItems] = useState<CommunityPostCard[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tags, setTags] = useState<Array<{ id: string; name: string; slug: string; count: number }>>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlTag = params.get('tag')
    if (urlTag) setTag(urlTag)
  }, [])

  useEffect(() => {
    void communityApi
      .tags()
      .then(({ items: list }) => setTags(list))
      .catch(() => undefined)
  }, [])

  const load = useCallback(
    async (targetPage: number, reset: boolean) => {
      if (reset) setLoading(true)
      else setLoadingMore(true)
      try {
        const data = await communityApi.list({
          sort,
          tag: tag || undefined,
          q: query || undefined,
          page: targetPage,
          limit: 12,
        })
        setItems((prev) => (reset ? data.items : [...prev, ...data.items]))
        setTotal(data.total)
        setPage(data.page)
        setHasMore(data.hasMore)
        setError(null)
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : '加载失败')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [sort, tag, query],
  )

  useEffect(() => {
    void load(1, true)
  }, [load])

  const clearFilters = () => {
    setTag('')
    setQuery('')
    setSearchDraft('')
    setSort('latest')
  }

  const hasFilter = Boolean(tag || query)
  const emptyCopy = useMemo(() => {
    if (query) return { title: '没有找到相关帖子', desc: '换个关键词，或清除筛选看看全部内容' }
    if (tag) return { title: `#${tag} 还没有内容`, desc: '成为第一个用这个标签发帖的人' }
    if (sort === 'following') return { title: '关注列表还很安静', desc: '去最新里逛逛，关注喜欢的作者' }
    return { title: '还没有人发帖', desc: '分享第一套穿搭，让大家看看你的思路' }
  }, [query, tag, sort])

  return (
    <div className="min-h-dvh bg-paper">
      <CommunityHeader />

      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-camel">COMMUNITY</p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl">穿搭讨论区</h1>
            <p className="mt-1 text-xs text-muted">晒搭配、聊场景，也可以直接提问「这套怎么改」。</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted">{total} 篇</span>
            <span className="hidden sm:inline-flex">
              <Button asChild size="sm">
                <Link href="/community/new">
                  <PenLine className="size-3.5" />
                  发布穿搭
                </Link>
              </Button>
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-paper-deep p-0.5">
              {SORTS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSort(item.key)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors',
                    sort === item.key ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form
              className="flex min-w-[180px] flex-1 items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault()
                setQuery(searchDraft.trim())
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <Input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="搜标题、正文或场景…"
                  className="h-9 pl-8 text-xs"
                />
              </div>
              <Button type="submit" size="sm" variant="outline">
                搜索
              </Button>
            </form>

            {hasFilter ? (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-ink"
              >
                <X className="size-3" />
                清除
              </button>
            ) : null}
          </div>

          {tags.length > 0 ? (
            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setTag('')}
                className={cn(
                  'shrink-0 rounded-full border px-2.5 py-1 text-[10px] transition-colors',
                  !tag ? 'border-ink bg-ink text-white' : 'border-line bg-paper text-muted hover:text-ink',
                )}
              >
                全部
              </button>
              {tags.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTag(tag === item.name ? '' : item.name)}
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-1 text-[10px] transition-colors',
                    tag === item.name
                      ? 'border-brand bg-brand-soft text-brand-strong'
                      : 'border-line bg-paper text-muted hover:text-ink',
                  )}
                >
                  #{item.name}
                  <span className="ml-1 opacity-60">{item.count}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-line bg-surface">
                  <div className="aspect-[16/10] animate-pulse bg-line/60" />
                  <div className="space-y-2 p-3.5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-line/60" />
                    <div className="h-3 w-full animate-pulse rounded bg-line/60" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-line/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-line bg-surface px-6 py-14 text-center">
              <p className="text-sm text-ink-soft">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void load(1, true)}>
                <RefreshCw className="size-3.5" />
                重试
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface px-6 py-16 text-center">
              <p className="font-display text-xl">{emptyCopy.title}</p>
              <p className="mt-1 text-xs text-muted">{emptyCopy.desc}</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button asChild size="sm">
                  <Link href="/community/new">发布第一篇</Link>
                </Button>
                {hasFilter ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    清除筛选
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {hasMore ? (
                <div className="mt-5 text-center">
                  <Button
                    variant="outline"
                    onClick={() => void load(page + 1, false)}
                    loading={loadingMore}
                  >
                    {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
                    加载更多
                  </Button>
                </div>
              ) : (
                <p className="mt-6 text-center text-[11px] text-muted">已经到底了 · 共 {total} 篇</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
