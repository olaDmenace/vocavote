'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setElectionStatus, publishResults } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

type Props = {
  electionId: number
  currentStatus: 'draft' | 'live' | 'closed'
  resultsPublished: boolean
}

export function ElectionStatusControls({ electionId, currentStatus, resultsPublished }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function changeStatus(next: 'draft' | 'live' | 'closed') {
    if (next === 'closed' && !confirm('Close election? Voting will stop.')) return
    if (next === 'live' && !confirm('Open election to voters?')) return
    setError(null)
    startTransition(async () => {
      const result = await setElectionStatus({ id: electionId, status: next })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  function onPublish() {
    if (!confirm('Publish results? This is irreversible.')) return
    setError(null)
    startTransition(async () => {
      const result = await publishResults({ electionId })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Current: <strong className="text-zinc-900 dark:text-zinc-50">{currentStatus}</strong>
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || currentStatus === 'draft'}
          onClick={() => changeStatus('draft')}
        >
          Set to draft
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || currentStatus === 'live'}
          onClick={() => changeStatus('live')}
        >
          Go live
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || currentStatus === 'closed'}
          onClick={() => changeStatus('closed')}
        >
          Close
        </Button>
        {currentStatus === 'closed' && !resultsPublished ? (
          <Button size="sm" disabled={isPending} onClick={onPublish}>
            Publish results
          </Button>
        ) : null}
        {resultsPublished ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
            Results published
          </span>
        ) : null}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  )
}
