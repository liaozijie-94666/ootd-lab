'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, MessageCircle, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ApiClientError } from '@/lib/api-client'
import { formatRelativeTime } from '@/lib/utils'
import { communityApi } from '../api'
import type { CommunityComment } from '@/types/community'

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="size-7 rounded-full object-cover" />
  }
  return (
    <span className="grid size-7 place-items-center rounded-full bg-brand-soft text-[10px] font-medium text-brand-strong">
      {name.slice(0, 1)}
    </span>
  )
}

export function CommentSection({
  postId,
  canModerate,
}: {
  postId: string
  canModerate: boolean
}) {
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(
    async (targetPage: number, reset: boolean) => {
      if (reset) setLoading(true)
      else setLoadingMore(true)
      try {
        const data = await communityApi.comments(postId, targetPage)
        setComments((prev) => (reset ? data.items : [...prev, ...data.items]))
        setPage(data.page)
        setHasMore(data.hasMore)
        setTotal(data.total)
        setError(false)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [postId],
  )

  useEffect(() => {
    void load(1, true)
  }, [load])

  const submit = async () => {
    if (!content.trim()) return
    if (content.trim().length > 500) {
      toast.error('评论最多 500 字')
      return
    }
    try {
      setSubmitting(true)
      const { comment } = await communityApi.addComment(postId, {
        content: content.trim(),
        parentId: replyTo?.id ?? null,
      })
      if (replyTo) {
        setComments((prev) =>
          prev.map((item) =>
            item.id === replyTo.id ? { ...item, replies: [...item.replies, comment] } : item,
          ),
        )
      } else {
        setComments((prev) => [...prev, comment])
        setTotal((value) => value + 1)
      }
      setContent('')
      setReplyTo(null)
      toast.success('评论已发布')
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'CONTENT_BLOCKED') {
        toast.error('评论包含敏感词，请修改后再发')
      } else {
        toast.error(error instanceof ApiClientError ? error.message : '评论失败，请重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (comment: CommunityComment) => {
    if (!window.confirm('删除这条评论？')) return
    try {
      await communityApi.deleteComment(comment.id)
      setComments((prev) =>
        prev
          .filter((item) => item.id !== comment.id)
          .map((item) => ({
            ...item,
            replies: item.replies.filter((reply) => reply.id !== comment.id),
          })),
      )
      if (!comment.parentId) setTotal((value) => Math.max(0, value - 1))
      toast.success('评论已删除')
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : '删除失败')
    }
  }

  const renderComment = (comment: CommunityComment, isReply = false) => {
    const canDelete = comment.isAuthor || canModerate
    return (
      <li key={comment.id} className={isReply ? 'ml-9 mt-3' : 'border-t border-line pt-4 first:border-0 first:pt-0'}>
        <div className="flex gap-2.5">
          <Avatar name={comment.author.name} url={comment.author.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-medium text-ink">{comment.author.name}</span>
              <span className="text-[10px] text-muted">{formatRelativeTime(comment.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
              {comment.content}
            </p>
            <div className="mt-1 flex items-center gap-3">
              {!isReply ? (
                <button
                  type="button"
                  onClick={() => setReplyTo(replyTo?.id === comment.id ? null : comment)}
                  className="text-[10px] text-muted hover:text-ink"
                >
                  {replyTo?.id === comment.id ? '取消回复' : '回复'}
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => void remove(comment)}
                  className="flex items-center gap-0.5 text-[10px] text-muted hover:text-danger"
                >
                  <Trash2 className="size-2.5" />
                  删除
                </button>
              ) : null}
            </div>

            {comment.replies.length > 0 ? (
              <ul className="mt-2 space-y-3 rounded-xl bg-paper/70 p-3">
                {comment.replies.map((reply) => renderComment(reply, true))}
              </ul>
            ) : null}
          </div>
        </div>
      </li>
    )
  }

  return (
    <section id="comments" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-4 text-camel" />
        <h2 className="font-display text-lg">评论</h2>
        <span className="text-[11px] text-muted">{total}</span>
      </div>

      <div className="mt-3">
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-brand-soft/60 px-2.5 py-1.5 text-[11px] text-brand-strong">
            正在回复 @{replyTo.author.name}
            <button type="button" onClick={() => setReplyTo(null)} className="underline">
              取消
            </button>
          </div>
        ) : null}
        <Textarea
          value={content}
          rows={3}
          maxLength={500}
          placeholder={replyTo ? `回复 @${replyTo.author.name}…` : '说点具体的，比如你会怎么改这套搭配'}
          onChange={(event) => setContent(event.target.value)}
          className="resize-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted">{content.length}/500</span>
          <Button size="sm" onClick={() => void submit()} loading={submitting} disabled={!content.trim()}>
            <Send className="size-3.5" />
            发表评论
          </Button>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex gap-2.5">
                <div className="size-7 animate-pulse rounded-full bg-line/60" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 animate-pulse rounded bg-line/60" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-line/60" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="py-4 text-center text-xs text-muted">
            评论加载失败，{' '}
            <button type="button" className="underline" onClick={() => void load(1, true)}>
              重试
            </button>
          </p>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-ink-soft">还没有评论</p>
            <p className="mt-1 text-[11px] text-muted">来抢个沙发，或者说说你的搭配思路</p>
          </div>
        ) : (
          <ul className="space-y-4">{comments.map((comment) => renderComment(comment))}</ul>
        )}

        {hasMore ? (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(page + 1, false)}
              loading={loadingMore}
            >
              加载更多评论
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
