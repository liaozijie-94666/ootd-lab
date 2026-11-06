'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Heart, MapPin, PenLine, Shirt, UserPlus, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { ApiClientError } from '@/lib/api-client'
import type { CommunityProfileResponse } from '@/types/community'
import { communityApi } from '../api'
import { CommunityHeader } from './community-header'
import { PostCard } from './post-card'

type Tab = 'posts' | 'favorites' | 'outfits'

export function ProfileView({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<CommunityProfileResponse | null>(null)
  const [tab, setTab] = useState<Tab>('posts')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await communityApi.profile(userId)
      setProfile(data)
      setFollowing(data.isFollowing)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : '主页加载失败')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const toggleFollow = async () => {
    if (!profile || busy) return
    setBusy(true)
    try {
      const result = await communityApi.follow(profile.user.id)
      setFollowing(result.following)
      setProfile({
        ...profile,
        stats: { ...profile.stats, followers: result.followers },
      })
      toast.success(result.following ? '已关注' : '已取消关注')
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-paper">
        <CommunityHeader />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <div className="h-32 animate-pulse rounded-2xl bg-line/60" />
        </main>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-dvh bg-paper">
        <CommunityHeader />
        <div className="grid min-h-[60vh] place-items-center px-4 text-center">
          <div>
            <p className="font-display text-xl">看不到这个主页</p>
            <p className="mt-1 text-xs text-muted">{error ?? '用户可能已注销'}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void load()}>
              重试
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { user, stats } = profile

  return (
    <div className="min-h-dvh bg-paper">
      <CommunityHeader />

      <main className="mx-auto max-w-5xl px-4 py-5">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start gap-4">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="size-16 rounded-2xl object-cover" />
            ) : (
              <span className="grid size-16 place-items-center rounded-2xl bg-brand-soft font-display text-2xl text-brand-strong">
                {user.name.slice(0, 1)}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl">{user.name}</h1>
              <p className="text-[11px] text-muted">@{user.handle}</p>
              {user.bio ? <p className="mt-2 text-xs leading-relaxed text-ink-soft">{user.bio}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                {user.city ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {user.city}
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {new Date(user.createdAt).toLocaleDateString('zh-CN')} 加入
                </span>
              </div>
            </div>

            {profile.isSelf ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/community/new">
                  <PenLine className="size-3.5" />
                  发布穿搭
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant={following ? 'outline' : 'default'}
                onClick={() => void toggleFollow()}
                loading={busy}
              >
                {following ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
                {following ? '已关注' : '关注'}
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-4 text-center">
            {[
              { label: '帖子', value: stats.posts },
              { label: '搭配', value: stats.outfits },
              { label: '关注', value: stats.following },
              { label: '粉丝', value: stats.followers },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-display text-xl leading-none">{item.value}</p>
                <p className="mt-1 text-[10px] text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 flex rounded-full bg-paper-deep p-1">
          {(
            [
              { key: 'posts', label: '帖子', count: stats.posts },
              { key: 'favorites', label: '收藏', count: profile.favorites.length },
              { key: 'outfits', label: '搭配方案', count: stats.outfits },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                'flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors',
                tab === item.key ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
              )}
            >
              {item.label}
              <span className="ml-1 opacity-60">{item.count}</span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === 'posts' ? (
            profile.posts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<PenLine className="size-5" />}
                title={profile.isSelf ? '还没有发布帖子' : 'TA 还没有发布帖子'}
                desc={profile.isSelf ? '分享一套搭配，认识同好' : '等 TA 更新，或先去讨论区逛逛'}
                action={
                  profile.isSelf ? (
                    <Button asChild size="sm">
                      <Link href="/community/new">去发布</Link>
                    </Button>
                  ) : null
                }
              />
            )
          ) : null}

          {tab === 'favorites' ? (
            profile.favorites.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.favorites.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Heart className="size-5" />}
                title="还没有收藏"
                desc="看到喜欢的帖子点个收藏，会出现在这里"
              />
            )
          ) : null}

          {tab === 'outfits' ? (
            profile.outfits.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.outfits.map((outfit) => (
                  <div
                    key={outfit.id}
                    className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft"
                  >
                    <div className="relative aspect-[3/4] bg-paper-deep">
                      {outfit.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={outfit.coverUrl} alt={outfit.title} className="size-full object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center text-muted">
                          <Shirt className="size-7" />
                        </span>
                      )}
                      {!outfit.isPublic ? (
                        <span className="absolute left-2 top-2">
                          <Badge>私密</Badge>
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between p-3">
                      <p className="truncate text-xs font-medium text-ink">{outfit.title}</p>
                      <span className="shrink-0 text-[10px] text-muted">{outfit.itemCount} 件</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Shirt className="size-5" />}
                title="还没有搭配方案"
                desc="去自由搭配或 AI 推荐生成一套，保存后会出现在这里"
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/outfit-studio">去搭配</Link>
                  </Button>
                }
              />
            )
          ) : null}
        </div>
      </main>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-6 py-14 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-paper-deep text-muted">
        {icon}
      </span>
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{desc}</p>
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  )
}
