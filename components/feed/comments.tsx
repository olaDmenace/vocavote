'use client'

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createComment } from '@/app/actions/posts'
import { moderateComment } from '@/app/actions/admin'
import { Avatar } from '@/components/profile/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { formatRelative } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'

export type FeedComment = {
  id: number
  body: string
  created_at: string
  author_id: string
  author: {
    full_name: string
    matric_no: string
    avatar_path: string | null
  }
}

type ViewerProfile = {
  id: string
  full_name: string
  matric_no: string
  avatar_path: string | null
}

type Props = {
  postId: number
  initialComments: FeedComment[]
  viewer: ViewerProfile
  isAdmin?: boolean
}

type OptimisticComment = FeedComment & { pending?: true }

export function CommentThread({ postId, initialComments, viewer, isAdmin = false }: Props) {
  const router = useRouter()
  const [serverComments, setServerComments] = useState<FeedComment[]>(initialComments)
  const [optimisticComments, addOptimisticComment] = useOptimistic<OptimisticComment[], OptimisticComment>(
    serverComments,
    (state, comment) => [...state, comment],
  )

  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Realtime: append fresh comments from other clients.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`comments-post-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const row = payload.new as { id: number; author_id: string; body: string; created_at: string; status: string }
          if (row.status !== 'active') return
          const { data: author } = await supabase
            .from('profiles')
            .select('full_name, matric_no, avatar_path')
            .eq('id', row.author_id)
            .maybeSingle()
          setServerComments((prev) => {
            if (prev.some((c) => c.id === row.id)) return prev
            return [
              ...prev,
              {
                id: row.id,
                body: row.body,
                created_at: row.created_at,
                author_id: row.author_id,
                author: {
                  full_name: author?.full_name ?? 'Unknown',
                  matric_no: author?.matric_no ?? '',
                  avatar_path: author?.avatar_path ?? null,
                },
              },
            ]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    setError(null)

    const tempId = -Date.now()
    const optimistic: OptimisticComment = {
      id: tempId,
      body: trimmed,
      created_at: new Date().toISOString(),
      author_id: viewer.id,
      author: {
        full_name: viewer.full_name,
        matric_no: viewer.matric_no,
        avatar_path: viewer.avatar_path,
      },
      pending: true,
    }

    startTransition(async () => {
      addOptimisticComment(optimistic)
      setBody('')
      const result = await createComment({ postId, body: trimmed })
      if (!result.ok) {
        setError(result.error.message)
        setBody(trimmed)
        return
      }
      // Realtime listener will append; in case it lags, refresh server state.
      router.refresh()
    })
  }

  function moderate(commentId: number) {
    if (!confirm('Delete this comment?')) return
    startTransition(async () => {
      const result = await moderateComment({ commentId, status: 'deleted' })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setServerComments((prev) => prev.filter((c) => c.id !== commentId))
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {optimisticComments.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <Avatar fullName={c.author.full_name} avatarPath={c.author.avatar_path} size="sm" />
            <div className="min-w-0 flex-1 rounded-md bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
              <div className="flex items-baseline gap-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {c.author.full_name}
                </span>
                {isAdmin || c.author_id === viewer.id ? (
                  <span>{c.author.matric_no}</span>
                ) : null}
                <span>·</span>
                <span>{formatRelative(c.created_at)}</span>
                {(c as OptimisticComment).pending ? (
                  <span className="italic">sending…</span>
                ) : null}
                {isAdmin && c.id > 0 && !(c as OptimisticComment).pending ? (
                  <button
                    type="button"
                    onClick={() => moderate(c.id)}
                    disabled={isPending}
                    className="ml-auto font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-800 dark:text-zinc-100">
                {c.body}
              </p>
            </div>
          </li>
        ))}
        {optimisticComments.length === 0 ? (
          <li className="text-sm text-zinc-500">No comments yet.</li>
        ) : null}
      </ul>

      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          maxLength={1500}
          rows={2}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
            {isPending ? 'Posting…' : 'Comment'}
          </Button>
        </div>
      </form>
    </div>
  )
}
