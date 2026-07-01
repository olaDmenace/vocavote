import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'

type LiveElection = {
  id: number
  title: string
  start_at: string
  end_at: string
  state: 'open' | 'upcoming' | 'ended'
}

export default async function BallotIndexPage() {
  await requireProfile()
  const supabase = await createClient()

  const { data: liveRows } = await supabase
    .from('elections')
    .select('id, title, start_at, end_at')
    .eq('status', 'live')
    .order('start_at', { ascending: true })

  const now = new Date().getTime()
  const live: LiveElection[] = (liveRows ?? []).map((e) => {
    const start = new Date(e.start_at).getTime()
    const end = new Date(e.end_at).getTime()
    const state = now < start ? 'upcoming' : now >= end ? 'ended' : 'open'
    return { id: e.id, title: e.title, start_at: e.start_at, end_at: e.end_at, state }
  })

  // Exactly one live election → go straight to it; its ballot page explains
  // whether voting is open, upcoming, or closed.
  if (live.length === 1) redirect(`/ballot/${live[0].id}`)

  if (live.length > 1) {
    // Open ballots first, then upcoming, then anything that has lapsed.
    const order = { open: 0, upcoming: 1, ended: 2 }
    const sorted = [...live].sort((a, b) => order[a.state] - order[b.state])
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Ballots
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {sorted.some((e) => e.state === 'open')
              ? 'Choose an election to cast your vote.'
              : 'No election is open for voting right now.'}
          </p>
        </header>

        {sorted.map((e) => (
          <Card key={e.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <div className="font-medium text-zinc-900 dark:text-zinc-50">{e.title}</div>
                <div className="text-xs text-zinc-500">
                  {e.state === 'open'
                    ? `Voting closes ${formatDateTime(e.end_at)}`
                    : e.state === 'upcoming'
                      ? `Voting opens ${formatDateTime(e.start_at)}`
                      : `Voting closed ${formatDateTime(e.end_at)}`}
                </div>
              </div>
              {e.state === 'open' ? (
                <Link
                  href={`/ballot/${e.id}`}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Vote now
                </Link>
              ) : (
                <Link
                  href={`/ballot/${e.id}`}
                  className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
                >
                  {e.state === 'upcoming' ? 'Preview →' : 'Details →'}
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // No live elections — surface recently published results instead of a dead end.
  const { data: published } = await supabase
    .from('elections')
    .select('id, title, end_at')
    .eq('status', 'closed')
    .eq('results_published', true)
    .order('end_at', { ascending: false })
    .limit(5)

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>No current elections</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            There&apos;s no election open for voting right now. When the electoral committee
            opens one, you&apos;ll see a banner on your feed and can vote here.
          </p>

          {published && published.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Published results
              </p>
              <ul className="flex flex-col gap-1">
                {published.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link
                      href={`/results/${e.id}`}
                      className="font-medium text-zinc-800 underline-offset-4 hover:underline dark:text-zinc-200"
                    >
                      {e.title}
                    </Link>
                    <span className="text-xs text-zinc-500">
                      closed {formatDateTime(e.end_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Link href="/feed" className="text-sm font-medium underline-offset-4 hover:underline">
            Back to feed
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
