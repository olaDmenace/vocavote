import Link from 'next/link'
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

  const [{ count: voterCount }, { count: electionCount }, { data: liveElection }] =
    await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('elections').select('*', { count: 'exact', head: true }),
      supabase
        .from('elections')
        .select('id, title, status, start_at, end_at')
        .eq('status', 'live')
        .maybeSingle(),
    ])

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
        <Stat label="Total students" value={voterCount ?? 0} />
        <Stat label="Elections" value={electionCount ?? 0} />
        <Stat label="Live now" value={liveElection ? 1 : 0} />
      </div>

      {liveElection ? (
        <Card>
          <CardHeader>
            <CardTitle>{liveElection.title}</CardTitle>
            <CardDescription>
              Live · ends {formatDateTime(liveElection.end_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link
              href={`/elections/${liveElection.id}`}
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              Manage
            </Link>
            <Link
              href={`/elections/${liveElection.id}/tally`}
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              Live tally
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{label}</div>
      </CardContent>
    </Card>
  )
}
