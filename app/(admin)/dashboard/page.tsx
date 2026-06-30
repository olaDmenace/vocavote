import Link from 'next/link'
import { Users, Vote, Radio, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [{ count: voterCount }, { count: electionCount }, { data: liveElections }] =
    await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('elections').select('*', { count: 'exact', head: true }),
      supabase
        .from('elections')
        .select('id, title, status, start_at, end_at')
        .eq('status', 'live')
        .order('start_at', { ascending: false }),
    ])

  const live = liveElections ?? []

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Admin dashboard
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Quick overview of the platform.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total students" value={voterCount ?? 0} icon={Users} />
        <Stat label="Elections" value={electionCount ?? 0} icon={Vote} />
        <Stat label="Live now" value={live.length} icon={Radio} accent={live.length > 0} />
      </div>

      {live.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-zinc-500">
            {live.length === 1 ? 'Live election' : `Live elections (${live.length})`}
          </h2>
          {live.map((election) => (
            <Card key={election.id}>
              <CardHeader>
                <CardTitle>{election.title}</CardTitle>
                <CardDescription>
                  Live · ends {formatDateTime(election.end_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Link
                  href={`/elections/${election.id}`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  Manage
                </Link>
                <Link
                  href={`/elections/${election.id}/tally`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  Live tally
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: number
  icon: LucideIcon
  accent?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <span
          className={
            accent
              ? 'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
          }
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <div className="text-3xl font-semibold leading-none text-zinc-900 dark:text-zinc-50">
            {value}
          </div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}
