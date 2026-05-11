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

  const { data: results } = await supabase
    .from('published_results')
    .select('position_id, position_title, candidate_id, candidate_name, vote_count')
    .eq('election_id', electionId)

  const grouped = new Map<
    number,
    { positionTitle: string; candidates: { name: string; count: number }[]; total: number }
  >()
  for (const r of results ?? []) {
    if (r.position_id === null || r.position_title === null) continue
    let g = grouped.get(r.position_id)
    if (!g) {
      g = { positionTitle: r.position_title, candidates: [], total: 0 }
      grouped.set(r.position_id, g)
    }
    g.candidates.push({
      name: r.candidate_name ?? 'Unknown',
      count: r.vote_count ?? 0,
    })
    g.total += r.vote_count ?? 0
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {election.title} — Results
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Official, published results.
        </p>
      </header>

      {Array.from(grouped.entries()).map(([positionId, g]) => {
        const sorted = [...g.candidates].sort((a, b) => b.count - a.count)
        const lead = sorted[0]
        return (
          <Card key={positionId}>
            <CardHeader>
              <CardTitle>{g.positionTitle}</CardTitle>
              <CardDescription>{g.total} total votes</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {sorted.map((c) => {
                  const pct = g.total > 0 ? Math.round((c.count / g.total) * 100) : 0
                  const isWinner = lead && c.count === lead.count && c.count > 0
                  return (
                    <li key={c.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-zinc-800 dark:text-zinc-200">
                        {c.name}
                        {isWinner ? (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                            winner
                          </span>
                        ) : null}
                      </span>
                      <span className="text-zinc-500">
                        {c.count} ({pct}%)
                      </span>
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
