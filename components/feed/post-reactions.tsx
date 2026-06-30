'use client'

import { useState, useTransition } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { react, type ReactionState } from '@/app/actions/posts'
import { cn } from '@/lib/utils/cn'

export function PostReactions({
  postId,
  initial,
}: {
  postId: number
  initial: ReactionState
}) {
  const [state, setState] = useState<ReactionState>(initial)
  const [isPending, startTransition] = useTransition()

  function applyOptimistic(prev: ReactionState, value: 1 | -1): ReactionState {
    let { likes, dislikes, mine } = prev
    if (mine === value) {
      // toggling off
      if (value === 1) likes--
      else dislikes--
      mine = 0
    } else {
      if (mine === 1) likes--
      if (mine === -1) dislikes--
      if (value === 1) likes++
      else dislikes++
      mine = value
    }
    return { likes, dislikes, mine }
  }

  function onReact(value: 1 | -1) {
    const previous = state
    setState((prev) => applyOptimistic(prev, value))
    startTransition(async () => {
      const result = await react({ postId, value })
      if (!result.ok) {
        setState(previous) // revert on failure
        return
      }
      setState(result.data)
    })
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onReact(1)}
        disabled={isPending}
        aria-pressed={state.mine === 1}
        aria-label="Like"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60',
          state.mine === 1
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800',
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
        {state.likes}
      </button>
      <button
        type="button"
        onClick={() => onReact(-1)}
        disabled={isPending}
        aria-pressed={state.mine === -1}
        aria-label="Dislike"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60',
          state.mine === -1
            ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800',
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
        {state.dislikes}
      </button>
    </div>
  )
}
