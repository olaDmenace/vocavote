'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteElection } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export function DeleteElectionButton({
  electionId,
  electionTitle,
}: {
  electionId: number
  electionTitle: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onDelete() {
    if (
      !confirm(
        `Delete "${electionTitle}"? This removes its positions and candidates and cannot be undone.`,
      )
    )
      return
    setError(null)
    startTransition(async () => {
      const result = await deleteElection({ electionId })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.push('/elections')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={isPending}>
          {isPending ? 'Deleting…' : 'Delete election'}
        </Button>
      </div>
      <p className="text-xs text-zinc-500">
        Elections with votes already cast can&apos;t be deleted — close them instead.
      </p>
    </div>
  )
}
