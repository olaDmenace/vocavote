import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = { params: Promise<{ electionId: string }> }

export default async function ResultsPage({ params }: Props) {
  const { electionId: rawId } = await params
  const electionId = Number(rawId)
  if (!Number.isFinite(electionId)) notFound()

  const supabase = await createClient()
  const { data: election } = await supabase
    .from('elections')
    .select('id, title, status, results_published, end_at')
    .eq('id', electionId)
    .maybeSingle()
  if (!election) notFound()

  if (!election.results_published) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {election.title}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Results have not been published yet.
            </p>
            <Link href="/feed" className="text-sm font-medium underline-offset-4 hover:underline">
              Back to feed
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Build the full ballot (every position + approved candidate) first, then layer
  // in vote counts. This way a published election with zero votes still renders
  // every position and candidate at 0 instead of a blank page.
  const [{ data: positions }, { data: candidates }, { data: results }, { data: turnout }] =
    await Promise.all([
      supabase
        .from('positions')
        .select('id, title, display_order')
        .eq('election_id', electionId)
        .order('display_order')
        .order('id'),
      supabase
        .from('candidates')
        .select('id, position_id, label, student:profiles!candidates_student_id_fkey(full_name)')
        .not('approved_at', 'is', null),
      supabase
        .from('published_results')
        .select('position_id, candidate_id, vote_count')
        .eq('election_id', electionId),
      supabase.rpc('election_turnout', { p_election_id: electionId }),
    ])

  const countByCandidate = new Map<number, number>()
  for (const r of results ?? []) {
    if (r.candidate_id === null) continue
    countByCandidate.set(r.candidate_id, r.vote_count ?? 0)
  }

  const positionIds = new Set((positions ?? []).map((p) => p.id))
  const grouped = new Map<
    number,
    { positionTitle: string; candidates: { name: string; count: number }[]; total: number }
  >()
  for (const p of positions ?? []) {
    grouped.set(p.id, { positionTitle: p.title, candidates: [], total: 0 })
  }
  for (const c of candidates ?? []) {
    if (!positionIds.has(c.position_id)) continue
    const g = grouped.get(c.position_id)
    if (!g) continue
    const student = Array.isArray(c.student) ? c.student[0] : c.student
    const count = countByCandidate.get(c.id) ?? 0
    // Poll options have no student — fall back to their text label.
    g.candidates.push({ name: student?.full_name ?? c.label ?? 'Unknown', count })
    g.total += count
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {election.title} — Results
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Official, published results ·{' '}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {turnout ?? 0} {turnout === 1 ? 'student' : 'students'} voted
          </span>
        </p>
      </header>

      {grouped.size === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-zinc-500">
            No positions were set up for this election, so there are no results to show.
          </CardContent>
        </Card>
      ) : null}

      {Array.from(grouped.entries()).map(([positionId, g]) => {
        const sorted = [...g.candidates].sort((a, b) => b.count - a.count)
        const topCount = sorted[0]?.count ?? 0
        // A tie is two or more candidates sharing the top (non-zero) count.
        const leaders = sorted.filter((c) => c.count === topCount && c.count > 0)
        const isTie = leaders.length > 1
        return (
          <Card key={positionId}>
            <CardHeader>
              <CardTitle>{g.positionTitle}</CardTitle>
              <CardDescription>
                {g.total} {g.total === 1 ? 'vote' : 'votes'} cast
                {isTie ? ` · tie between ${leaders.length}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {sorted.map((c) => {
                  const pct = g.total > 0 ? Math.round((c.count / g.total) * 100) : 0
                  const isLeader = c.count === topCount && c.count > 0
                  return (
                    <li key={c.name} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate text-zinc-800 dark:text-zinc-200">
                          {c.name}
                          {isLeader ? (
                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                              {isTie ? 'tie' : 'winner'}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 tabular-nums text-zinc-500">
                          {c.count} {c.count === 1 ? 'vote' : 'votes'} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${
                            isLeader
                              ? 'bg-emerald-500 dark:bg-emerald-400'
                              : 'bg-zinc-400 dark:bg-zinc-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
