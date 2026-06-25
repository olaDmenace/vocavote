'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { moderatePost } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

type Props = {
  postId: number
  status: 'active' | 'hidden' | 'deleted'
}

export function PostModerationMenu({ postId, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function change(next: 'active' | 'hidden' | 'deleted') {
    if (next === 'deleted' && !confirm('Delete this post? It will be hidden from everyone.')) return
    setError(null)
    startTransition(async () => {
      const result = await moderatePost({ postId, status: next })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-1">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {status === 'hidden' ? (
        <Button size="sm" variant="outline" onClick={() => change('active')} disabled={isPending}>
          Restore
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => change('hidden')} disabled={isPending}>
          Hide
        </Button>
      )}
      <Button size="sm" variant="destructive" onClick={() => change('deleted')} disabled={isPending}>
        Delete
      </Button>
    </div>
  )
}
