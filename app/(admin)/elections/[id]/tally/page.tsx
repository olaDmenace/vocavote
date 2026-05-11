import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TallyView } from './tally-view'
import type { TallyRow } from '@/lib/realtime/use-tally'

type Props = { params: Promise<{ id: string }> }

export default async function TallyPage({ params }: Props) {
  const { id } = await params
  const electionId = Number(id)
  if (!Number.isFinite(electionId)) notFound()

  const supabase = await createClient()

  const [{ data: election }, { data: tally }, { count: totalVoters }, { count: totalVotes }] =
    await Promise.all([
      supabase
        .from('elections')
        .select('id, title, status, end_at, results_published')
        .eq('id', electionId)
        .maybeSingle(),
      supabase.rpc('tally_for_election', { p_election_id: electionId }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', electionId),
    ])

  if (!election) notFound()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href={`/elections/${election.id}`} className="text-sm text-zinc-500 hover:underline">
          ← {election.title}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Live tally
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Updates in real time via Supabase Realtime.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Eligible voters" value={totalVoters ?? 0} />
        <Stat label="Votes cast" value={totalVotes ?? 0} />
        <Stat
          label="Turnout"
          value={
            totalVoters && totalVoters > 0
              ? `${Math.round(((totalVotes ?? 0) / totalVoters) * 100)}%`
              : '—'
          }
        />
      </div>

      <TallyView electionId={election.id} initialRows={(tally as TallyRow[]) ?? []} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{label}</div>
    </div>
  )
}
