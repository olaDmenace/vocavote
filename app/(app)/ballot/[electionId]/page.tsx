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

  await requireProfile()
  const supabase = await createClient()

  const { data: election } = await supabase
    .from('elections')
    .select('id, title, description, status, start_at, end_at')
    .eq('id', electionId)
    .maybeSingle()

  if (!election) notFound()

  const now = new Date()
  const isLive =
    election.status === 'live' &&
    new Date(election.start_at) <= now &&
    new Date(election.end_at) > now

  if (!isLive) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {election.title}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Voting is not open right now.
            </p>
            <p className="text-xs text-zinc-500">
              Window: {formatDateTime(election.start_at)} → {formatDateTime(election.end_at)}
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
        'id, title, description, display_order, candidates(id, approved_at, student:profiles!candidates_student_id_fkey(id, full_name, matric_no, avatar_path), manifesto_post_id, manifesto:posts!candidates_manifesto_post_id_fkey(id, title, body))',
      )
      .eq('election_id', electionId)
      .order('display_order')
      .order('id'),
    getVotedPositionIds(electionId),
  ])

  const ballotPositions: BallotPosition[] = (positions ?? []).map((p) => {
    const approved = (p.candidates ?? []).filter((c) => c.approved_at !== null)
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      alreadyVoted: votedPositionIds.includes(p.id),
      candidates: approved.map((c) => {
        const student = Array.isArray(c.student) ? c.student[0] : c.student
        const manifesto = Array.isArray(c.manifesto) ? c.manifesto[0] : c.manifesto
        return {
          id: c.id,
          fullName: student?.full_name ?? 'Unknown',
          matricNo: student?.matric_no ?? '',
          avatarPath: student?.avatar_path ?? null,
          manifestoTitle: manifesto?.title ?? null,
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

      <Ballot positions={ballotPositions} />
    </div>
  )
}
