'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deletePost } from '@/app/actions/posts'
import { Button } from '@/components/ui/button'

export function DeletePostButton({ postId }: { postId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onDelete() {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setError(null)
    startTransition(async () => {
      const result = await deletePost({ postId })
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
      <Button size="sm" variant="destructive" onClick={onDelete} disabled={isPending}>
        Delete
      </Button>
    </div>
  )
}
