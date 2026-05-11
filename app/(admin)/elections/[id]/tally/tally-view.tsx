'use client'

import { useMemo } from 'react'
import { useTally, type TallyRow } from '@/lib/realtime/use-tally'

type GroupedPosition = {
  positionId: number
  positionTitle: string
  candidates: { candidateId: number; candidateName: string; voteCount: number }[]
  total: number
}

export function TallyView({
  electionId,
  initialRows,
}: {
  electionId: number
  initialRows: TallyRow[]
}) {
  const rows = useTally(electionId, initialRows)

  const grouped: GroupedPosition[] = useMemo(() => {
    const map = new Map<number, GroupedPosition>()
    for (const r of rows) {
      let g = map.get(r.position_id)
      if (!g) {
        g = {
          positionId: r.position_id,
          positionTitle: r.position_title,
          candidates: [],
          total: 0,
        }
        map.set(r.position_id, g)
      }
      g.candidates.push({
        candidateId: r.candidate_id,
        candidateName: r.candidate_name,
        voteCount: r.vote_count,
      })
      g.total += r.vote_count
    }
    return Array.from(map.values()).map((g) => ({
      ...g,
      candidates: [...g.candidates].sort((a, b) => b.voteCount - a.voteCount),
    }))
  }, [rows])

  if (grouped.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        No candidates approved yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map((g) => {
        const leadCount = g.candidates[0]?.voteCount ?? 0
        return (
          <div
            key={g.positionId}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {g.positionTitle}
              </h3>
              <span className="text-xs text-zinc-500">{g.total} total</span>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {g.candidates.map((c) => {
                const pctOfLeader = leadCount > 0 ? (c.voteCount / leadCount) * 100 : 0
                const pctOfTotal = g.total > 0 ? Math.round((c.voteCount / g.total) * 100) : 0
                const isLeader = c.voteCount > 0 && c.voteCount === leadCount
                return (
                  <li key={c.candidateId}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span
                        className={
                          isLeader
                            ? 'font-semibold text-zinc-900 dark:text-zinc-50'
                            : 'text-zinc-800 dark:text-zinc-200'
                        }
                      >
                        {c.candidateName}
                        {isLeader ? (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                            leading
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {c.voteCount} ({pctOfTotal}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-zinc-900 transition-[width] duration-500 dark:bg-zinc-50"
                        style={{ width: `${pctOfLeader}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
