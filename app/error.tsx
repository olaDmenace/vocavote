'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        We hit an error while loading this page. If it keeps happening, contact the electoral
        committee.
        {error.digest ? <span className="ml-1 text-xs">Ref: {error.digest}</span> : null}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
