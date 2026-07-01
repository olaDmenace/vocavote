import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { getVotedPositionIds } from '@/app/actions/votes'
import { Ballot, type BallotPosition } from './ballot'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'

type Props = { params: Promise<{ electionId: string }> }

export default async function BallotPage({ params }: Props) {
  const { electionId: rawId } = await params
  const electionId = Number(rawId)
  if (!Number.isFinite(electionId)) notFound()

  const viewer = await requireProfile()
  const supabase = await createClient()

  const { data: election } = await supabase
    .from('elections')
    .select('id, title, description, status, start_at, end_at, results_published')
    .eq('id', electionId)
    .maybeSingle()

  if (!election) notFound()

  const now = new Date()
  const started = new Date(election.start_at) <= now
  const ended = new Date(election.end_at) <= now
  const isOpen = election.status === 'live' && started && !ended
  // Voting is scheduled but hasn't opened yet — campaign period.
  const isUpcoming = election.status === 'live' && !started

  if (!isOpen) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {election.title}
            </h1>

            {isUpcoming ? (
              <>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Voting opens{' '}
                  <strong className="text-zinc-900 dark:text-zinc-50">
                    {formatDateTime(election.start_at)}
                  </strong>
                  . Meet the candidates and read their manifestos in the meantime.
                </p>
                <Link
                  href="/candidates"
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  Meet the candidates →
                </Link>
              </>
            ) : ended ? (
              <>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Voting has closed.</p>
                {election.results_published ? (
                  <Link
                    href={`/results/${election.id}`}
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    View results →
                  </Link>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Results will be published by the electoral committee.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Voting is not open right now.
              </p>
            )}

            <p className="text-xs text-zinc-500">
              Voting window: {formatDateTime(election.start_at)} →{' '}
              {formatDateTime(election.end_at)}
            </p>
            <Link href="/feed" className="text-sm font-medium underline-offset-4 hover:underline">
              Back to feed
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [{ data: positions }, votedPositionIds] = await Promise.all([
    supabase
      .from('positions')
      .select(
        'id, title, description, display_order, kind, candidates(id, approved_at, label, student:profiles!candidates_student_id_fkey(id, full_name, matric_no, avatar_path), manifesto_post_id, manifesto:posts!fk_candidate_manifesto(id, title, body))',
      )
      .eq('election_id', electionId)
      .order('display_order')
      .order('id'),
    getVotedPositionIds(electionId),
  ])

  const ballotPositions: BallotPosition[] = (positions ?? []).map((p) => {
    const approved = (p.candidates ?? []).filter((c) => c.approved_at !== null)
    const isPoll = p.kind === 'poll'
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      isPoll,
      alreadyVoted: votedPositionIds.includes(p.id),
      candidates: approved.map((c) => {
        const student = Array.isArray(c.student) ? c.student[0] : c.student
        const manifesto = Array.isArray(c.manifesto) ? c.manifesto[0] : c.manifesto
        return {
          id: c.id,
          // A poll option has no student — display its text label.
          fullName: student?.full_name ?? c.label ?? 'Unknown',
          matricNo: student?.matric_no ?? '',
          avatarPath: student?.avatar_path ?? null,
          manifestoTitle: manifesto?.title ?? null,
          isOption: !student,
        }
      }),
    }
  })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {election.title}
        </h1>
        {election.description ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {election.description}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-zinc-500">
          Voting closes {formatDateTime(election.end_at)}
        </p>
      </header>

      <Ballot positions={ballotPositions} showMatric={viewer.role === 'admin'} />
    </div>
  )
}
