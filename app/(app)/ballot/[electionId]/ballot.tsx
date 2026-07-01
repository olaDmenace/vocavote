'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { castVote } from '@/app/actions/votes'
import { Avatar } from '@/components/profile/avatar'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ACTION_ERRORS } from '@/types/domain'

export type BallotCandidate = {
  id: number
  fullName: string
  matricNo: string
  avatarPath: string | null
  manifestoTitle: string | null
  isOption: boolean
}

export type BallotPosition = {
  id: number
  title: string
  description: string | null
  isPoll: boolean
  alreadyVoted: boolean
  candidates: BallotCandidate[]
}

export function Ballot({
  positions,
  showMatric = false,
}: {
  positions: BallotPosition[]
  showMatric?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selections, setSelections] = useState<Record<number, number | undefined>>({})
  const [confirmingPositionId, setConfirmingPositionId] = useState<number | null>(null)
  const [statuses, setStatuses] = useState<Record<number, { tone: 'success' | 'error'; text: string }>>({})

  function onSelect(positionId: number, candidateId: number) {
    // One candidate per position; clicking the selected one again clears it.
    setSelections((prev) => ({
      ...prev,
      [positionId]: prev[positionId] === candidateId ? undefined : candidateId,
    }))
    setConfirmingPositionId((cur) => (cur === positionId ? null : cur))
  }

  function onClear(positionId: number) {
    setSelections((prev) => {
      const next = { ...prev }
      delete next[positionId]
      return next
    })
    setConfirmingPositionId((cur) => (cur === positionId ? null : cur))
  }

  function submitVote(positionId: number, candidateId: number) {
    startTransition(async () => {
      const result = await castVote({ positionId, candidateId })
      if (!result.ok) {
        setStatuses((prev) => ({
          ...prev,
          [positionId]: { tone: 'error', text: result.error.message },
        }))
      } else {
        setStatuses((prev) => ({
          ...prev,
          [positionId]: { tone: 'success', text: 'Vote recorded.' },
        }))
        router.refresh()
      }
      setConfirmingPositionId(null)
    })
  }

  const openPositions = positions.filter((p) => !p.alreadyVoted)
  const completedPositions = positions.filter((p) => p.alreadyVoted)

  return (
    <div className="flex flex-col gap-5">
      {openPositions.length === 0 && completedPositions.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
            <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
              You&apos;ve voted on every position.
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Results will be available after the election closes and the admin publishes them.
            </p>
            <Link href="/feed" className="text-sm font-medium underline-offset-4 hover:underline">
              Back to feed
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {openPositions.map((position) => {
        const selected = selections[position.id]
        const status = statuses[position.id]
        const isConfirming = confirmingPositionId === position.id

        return (
          <Card key={position.id}>
            <CardHeader>
              <CardTitle>{position.title}</CardTitle>
              {position.description ? (
                <CardDescription>{position.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {position.candidates.length === 0 ? (
                <p className="text-sm text-zinc-500">No approved candidates yet.</p>
              ) : (
                <fieldset className="flex flex-col gap-2" aria-label={position.title}>
                  <legend className="pb-1 text-xs text-zinc-500">
                    Select one {position.isPoll ? 'option' : 'candidate'} for {position.title}.
                  </legend>
                  {position.candidates.map((c) => {
                    const inputId = `pos-${position.id}-cand-${c.id}`
                    const isSelected = selected === c.id
                    return (
                      <label
                        key={c.id}
                        htmlFor={inputId}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                          isSelected
                            ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900'
                            : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`position-${position.id}`}
                          id={inputId}
                          value={c.id}
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={() => onSelect(position.id, c.id)}
                          className="h-4 w-4 shrink-0"
                          disabled={isPending}
                        />
                        {c.isOption ? (
                          <div className="min-w-0 flex-1 font-medium text-zinc-900 dark:text-zinc-50">
                            {c.fullName}
                          </div>
                        ) : (
                          <>
                            <Avatar fullName={c.fullName} avatarPath={c.avatarPath} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                                {c.fullName}
                              </div>
                              <div className="truncate text-xs text-zinc-500">
                                {showMatric ? c.matricNo : null}
                                {showMatric && c.manifestoTitle ? ' · ' : ''}
                                {c.manifestoTitle ?? ''}
                              </div>
                            </div>
                            <Link
                              href={`/candidates/${c.id}`}
                              className="shrink-0 whitespace-nowrap text-xs font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
                            >
                              Read manifesto
                            </Link>
                          </>
                        )}
                      </label>
                    )
                  })}
                </fieldset>
              )}

              {status ? <Alert tone={status.tone}>{status.text}</Alert> : null}

              {isConfirming && selected ? (
                <div className="flex flex-col gap-3 rounded-md border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">
                    Confirm vote for{' '}
                    <strong>
                      {position.candidates.find((c) => c.id === selected)?.fullName}
                    </strong>{' '}
                    as {position.title}. This cannot be changed.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingPositionId(null)}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => submitVote(position.id, selected)}
                      disabled={isPending}
                    >
                      {isPending ? 'Submitting…' : 'Confirm vote'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2">
                  {selected ? (
                    <Button
                      variant="outline"
                      onClick={() => onClear(position.id)}
                      disabled={isPending}
                    >
                      Clear
                    </Button>
                  ) : null}
                  <Button
                    disabled={!selected || isPending || position.candidates.length === 0}
                    onClick={() => setConfirmingPositionId(position.id)}
                  >
                    Cast vote
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {completedPositions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completed</CardTitle>
            <CardDescription>{ACTION_ERRORS.already_voted.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              {completedPositions.map((p) => (
                <li
                  key={p.id}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {p.title}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
