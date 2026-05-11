'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPost } from '@/app/actions/posts'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'

export function CreatePostForm() {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    setError(null)
    startTransition(async () => {
      const result = await createPost({ type: 'discussion', body: trimmed })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setBody('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind? Markdown supported."
        rows={3}
        maxLength={8000}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !body.trim()}>
          {isPending ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </form>
  )
}
