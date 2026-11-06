'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/primitives'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiClientError } from '@/lib/api-client'
import { communityApi } from '../api'
import { CommunityHeader } from './community-header'
import { ImageUploader, type UploadedImage } from './image-uploader'
import { TagInput } from './tag-input'

interface OutfitOption {
  id: string
  title: string
  itemCount: number
}

interface RecommendationOption {
  id: string
  styleSummary: string
  itemCount: number
}

export function PostEditor({ postId }: { postId?: string }) {
  const router = useRouter()
  const isEdit = Boolean(postId)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [outfitId, setOutfitId] = useState<string>('')
  const [recommendationId, setRecommendationId] = useState<string>('')

  const [outfits, setOutfits] = useState<OutfitOption[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationOption[]>([])

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void communityApi
      .myOutfits()
      .then(({ items }) =>
        setOutfits(items.map((item) => ({ id: item.id, title: item.title, itemCount: item.itemCount }))),
      )
      .catch(() => undefined)
    void communityApi
      .myRecommendations()
      .then(({ items }) =>
        setRecommendations(
          items.map((item) => ({
            id: item.id,
            styleSummary: item.styleSummary,
            itemCount: item.itemCount,
          })),
        ),
      )
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (postId) return
    const params = new URLSearchParams(window.location.search)
    const outfit = params.get('outfitId')
    const recommendation = params.get('recommendationId')
    if (outfit) setOutfitId(outfit)
    if (recommendation) setRecommendationId(recommendation)
  }, [postId])

  useEffect(() => {
    if (!postId) return
    let cancelled = false
    communityApi
      .get(postId)
      .then(({ post }) => {
        if (cancelled) return
        setTitle(post.title)
        setContent(post.content)
        setImages(post.images.map((image) => ({ id: image.id, url: image.url })))
        setTags(post.tags.map((tag) => tag.name))
        setOutfitId(post.outfit?.id ?? '')
        setRecommendationId(post.recommendation?.id ?? '')
      })
      .catch((error) => {
        toast.error(error instanceof ApiClientError ? error.message : '帖子加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [postId])

  const handleSubmit = async () => {
    if (title.trim().length < 5) {
      toast.error('标题至少 5 个字')
      return
    }
    if (!content.trim()) {
      toast.error('写点正文吧')
      return
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      imageIds: images.map((image) => image.id),
      tags,
      outfitId: outfitId || null,
      recommendationId: recommendationId || null,
    }

    try {
      setSubmitting(true)
      if (isEdit && postId) {
        await communityApi.update(postId, payload)
        toast.success('已保存修改')
        router.push(`/community/${postId}`)
      } else {
        const { post } = await communityApi.create(payload)
        if (post.status === 'PENDING_REVIEW') {
          toast.info('内容进入审核，通过后对所有人可见')
        } else {
          toast.success('发布成功')
        }
        router.push(`/community/${post.id}`)
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'CONTENT_BLOCKED') {
        const matches = (error.details as { matches?: string[] } | undefined)?.matches ?? []
        toast.error(`${error.message}${matches.length ? `（${matches.join('、')}）` : ''}`)
      } else {
        toast.error(error instanceof ApiClientError ? error.message : '发布失败，请重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-paper">
        <CommunityHeader />
        <div className="grid min-h-[60vh] place-items-center text-sm text-muted">
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            正在加载帖子…
          </span>
        </div>
      </div>
    )
  }

  const selectedOutfit = outfits.find((item) => item.id === outfitId)
  const selectedRecommendation = recommendations.find((item) => item.id === recommendationId)

  return (
    <div className="min-h-dvh bg-paper">
      <CommunityHeader
        right={
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link href={isEdit && postId ? `/community/${postId}` : '/community'}>
              <ArrowLeft className="size-3.5" />
              返回
            </Link>
          </Button>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Link
          href={isEdit && postId ? `/community/${postId}` : '/community'}
          className="mb-4 inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
        >
          <ArrowLeft className="size-3" />
          {isEdit ? '返回帖子' : '返回讨论区'}
        </Link>

        <h1 className="font-display text-2xl sm:text-3xl">{isEdit ? '编辑帖子' : '分享你的穿搭'}</h1>
        <p className="mt-1 text-xs text-muted">
          可以只发文字，也可以带图；关联搭配方案后，详情页会自动展示衣服数据。
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-line bg-surface p-4">
              <Label htmlFor="post-title">标题</Label>
              <Input
                id="post-title"
                value={title}
                maxLength={80}
                placeholder="例如：互联网公司面试穿这套稳了"
                className="mt-2"
                onChange={(event) => setTitle(event.target.value)}
              />
              <p className="mt-1 text-right text-[10px] text-muted">{title.length}/80</p>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4">
              <Label htmlFor="post-content">正文</Label>
              <Textarea
                id="post-content"
                value={content}
                maxLength={5000}
                rows={12}
                placeholder="说说这套搭配的思路、场合，或者踩过的坑…"
                className="mt-2 resize-y"
                onChange={(event) => setContent(event.target.value)}
              />
              <p className="mt-1 text-right text-[10px] text-muted">{content.length}/5000</p>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4">
              <Label>配图</Label>
              <div className="mt-2">
                <ImageUploader value={images} onChange={setImages} />
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-line bg-surface p-4">
              <Label>标签</Label>
              <div className="mt-2">
                <TagInput value={tags} onChange={setTags} />
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4">
              <Label>关联搭配</Label>
              <div className="mt-2 space-y-2">
                <Select
                  value={outfitId}
                  onChange={(event) => {
                    setOutfitId(event.target.value)
                    if (event.target.value) setRecommendationId('')
                  }}
                  className="h-10 w-full rounded-xl text-sm"
                >
                  <option value="">不关联方案</option>
                  {outfits.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}（{item.itemCount} 件）
                    </option>
                  ))}
                </Select>

                <Select
                  value={recommendationId}
                  onChange={(event) => {
                    setRecommendationId(event.target.value)
                    if (event.target.value) setOutfitId('')
                  }}
                  className="h-10 w-full rounded-xl text-sm"
                >
                  <option value="">不关联 AI 推荐</option>
                  {recommendations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.styleSummary}（{item.itemCount} 件）
                    </option>
                  ))}
                </Select>
              </div>

              {selectedOutfit || selectedRecommendation ? (
                <div className="mt-3 flex gap-2 rounded-xl bg-brand-soft/50 p-2.5 text-[11px] leading-relaxed text-brand-strong">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                  {selectedOutfit
                    ? `将自动带入「${selectedOutfit.title}」的 ${selectedOutfit.itemCount} 件单品数据。`
                    : `将自动带入「${selectedRecommendation?.styleSummary}」的风格总结与单品清单。`}
                </div>
              ) : (
                <p className="mt-2 text-[10px] leading-relaxed text-muted">
                  关联后，读者能看到这套搭配的完整单品与购买信息。
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4">
              <Button
                className="w-full"
                onClick={() => void handleSubmit()}
                loading={submitting}
                disabled={title.trim().length < 5 || !content.trim()}
              >
                <Send className="size-4" />
                {isEdit ? '保存修改' : '发布帖子'}
              </Button>
              <p className="mt-2 text-[10px] leading-relaxed text-muted">
                发布前会进行敏感词与图片审核；违规内容可能进入人工复审。
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
