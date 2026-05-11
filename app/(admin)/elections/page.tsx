import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ElectionCreator } from './election-creator'
import { formatDateTime } from '@/lib/utils/format'

export default async function ElectionsPage() {
  const supabase = await createClient()
  const { data: elections } = await supabase
    .from('elections')
    .select('id, title, status, start_at, end_at, results_published')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Elections
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create elections, add positions, approve candidates.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>New election</CardTitle>
          <CardDescription>Start in draft. Flip to live when ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <ElectionCreator />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All elections</CardTitle>
        </CardHeader>
        <CardContent>
          {elections && elections.length > 0 ? (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {elections.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <Link
                      href={`/elections/${e.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {e.title}
                    </Link>
                    <div className="text-xs text-zinc-500">
                      {formatDateTime(e.start_at)} → {formatDateTime(e.end_at)}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusToneClass(e.status)}`}
                  >
                    {e.status}
                    {e.results_published ? ' · published' : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No elections yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function statusToneClass(status: string) {
  switch (status) {
    case 'live':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
    case 'closed':
      return 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  }
}
