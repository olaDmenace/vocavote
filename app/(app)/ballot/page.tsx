import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'

export default async function BallotIndexPage() {
  await requireProfile()
  const supabase = await createClient()

  const nowIso = new Date().toISOString()

  // A live election whose voting window is currently open — jump straight to it.
  const { data: openElection } = await supabase
    .from('elections')
    .select('id')
    .eq('status', 'live')
    .lte('start_at', nowIso)
    .gt('end_at', nowIso)
    .order('end_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (openElection) redirect(`/ballot/${openElection.id}`)

  // Otherwise show recently published results so the trip isn't a dead end.
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
