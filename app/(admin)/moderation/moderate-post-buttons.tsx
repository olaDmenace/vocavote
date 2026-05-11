'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { moderatePost } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

type Props = {
  postId: number
  status: 'active' | 'hidden' | 'deleted'
}

export function ModeratePostButtons({ postId, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function change(next: 'active' | 'hidden' | 'deleted') {
    if (next === 'deleted' && !confirm('Mark this post as deleted? Voters will not see it.')) return
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
    <div className="flex flex-wrap items-center gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {status !== 'active' ? (
        <Button size="sm" variant="outline" onClick={() => change('active')} disabled={isPending}>
          Restore
        </Button>
      ) : null}
      {status !== 'hidden' ? (
        <Button size="sm" variant="outline" onClick={() => change('hidden')} disabled={isPending}>
          Hide
        </Button>
      ) : null}
      {status !== 'deleted' ? (
        <Button size="sm" variant="destructive" onClick={() => change('deleted')} disabled={isPending}>
          Delete
        </Button>
      ) : null}
    </div>
  )
}
