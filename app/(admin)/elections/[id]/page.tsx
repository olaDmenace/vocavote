import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'
import { ElectionStatusControls } from './election-status-controls'
import { PositionsEditor } from './positions-editor'
import { CandidatesEditor } from './candidates-editor'

type Props = { params: Promise<{ id: string }> }

export default async function ElectionEditorPage({ params }: Props) {
  const { id } = await params
  const electionId = Number(id)
  if (!Number.isFinite(electionId)) notFound()

  const supabase = await createClient()

  const [{ data: election }, { data: positions }, { data: candidates }, { data: students }] =
    await Promise.all([
      supabase.from('elections').select('*').eq('id', electionId).maybeSingle(),
      supabase
        .from('positions')
        .select('id, title, description, display_order')
        .eq('election_id', electionId)
        .order('display_order')
        .order('id'),
      supabase
        .from('candidates')
        .select('id, student_id, position_id, approved_at, profiles!candidates_student_id_fkey(full_name, matric_no)')
        .order('id'),
      supabase
        .from('profiles')
        .select('id, matric_no, full_name')
        .eq('role', 'student')
        .order('matric_no')
        .limit(500),
    ])

  if (!election) notFound()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href="/elections" className="text-sm text-zinc-500 hover:underline">
          ← Elections
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {election.title}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatDateTime(election.start_at)} → {formatDateTime(election.end_at)}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>
            Move to <code>live</code> when ballots are ready. Closing is final.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ElectionStatusControls
            electionId={election.id}
            currentStatus={election.status as 'draft' | 'live' | 'closed'}
            resultsPublished={election.results_published}
          />
          {election.status === 'live' || election.status === 'closed' ? (
            <div className="mt-3 text-sm">
              <Link
                href={`/elections/${election.id}/tally`}
                className="font-medium underline-offset-4 hover:underline"
              >
                Live tally →
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
          <CardDescription>Each position gets its own ballot.</CardDescription>
        </CardHeader>
        <CardContent>
          <PositionsEditor electionId={election.id} positions={positions ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Candidates</CardTitle>
          <CardDescription>
            Approved candidates appear on the ballot. Revoke to remove.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CandidatesEditor
            positions={positions ?? []}
            candidates={(candidates ?? []).filter((c) =>
              (positions ?? []).some((p) => p.id === c.position_id),
            )}
            students={students ?? []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
