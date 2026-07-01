import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { Avatar } from '@/components/profile/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'

type ElectionRow = {
  id: number
  title: string
  status: string
  start_at: string
  end_at: string
}

export default async function CandidatesPage() {
  const viewer = await requireProfile()
  const supabase = await createClient()

  // Candidates are a campaign-period view, so only show live elections (open or
  // upcoming). Closed/published elections belong on the results page, not here.
  const { data: liveElections } = await supabase
    .from('elections')
    .select('id, title, status, start_at, end_at')
    .eq('status', 'live')
    .order('start_at', { ascending: false })

  const elections: ElectionRow[] = liveElections ?? []

  if (elections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-zinc-500">
          No election is currently active. Candidates appear here once the electoral
          committee opens an election.
        </CardContent>
      </Card>
    )
  }

  const electionIds = elections.map((e) => e.id)
  const { data: positions } = await supabase
    .from('positions')
    .select(
      'id, title, election_id, display_order, candidates(id, approved_at, student:profiles!candidates_student_id_fkey(id, full_name, matric_no, avatar_path, department))',
    )
    .in('election_id', electionIds)
    .eq('kind', 'candidates')
    .order('display_order')
    .order('id')

  const rows = positions ?? []
  const positionsByElection = new Map<number, typeof rows>()
  for (const p of rows) {
    const arr = positionsByElection.get(p.election_id) ?? []
    arr.push(p)
    positionsByElection.set(p.election_id, arr)
  }

  const isAdmin = viewer.role === 'admin'
  const now = new Date().getTime()

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Candidates
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {elections.length > 1
            ? `Browse candidates across ${elections.length} live elections.`
            : `Browse candidates for ${elections[0].title}.`}
        </p>
      </header>

      {elections.map((election) => {
        const electionPositions = positionsByElection.get(election.id) ?? []
        const badge = electionBadge(election, now)
        const isOpen = badge.state === 'open'
        return (
          <section key={election.id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {election.title}
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              {isOpen ? (
                <Link
                  href={`/ballot/${election.id}`}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Go to ballot
                </Link>
              ) : election.status === 'live' && badge.state === 'upcoming' ? (
                <Link
                  href={`/ballot/${election.id}`}
                  className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
                >
                  Preview ballot →
                </Link>
              ) : null}
            </div>

            {electionPositions.length === 0 ? (
              <p className="text-sm text-zinc-500">No positions yet.</p>
            ) : (
              electionPositions.map((position) => {
                const approved = (position.candidates ?? []).filter(
                  (c) => c.approved_at !== null,
                )
                return (
                  <Card key={position.id}>
                    <CardHeader>
                      <CardTitle>{position.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {approved.length === 0 ? (
                        <p className="text-sm text-zinc-500">No approved candidates yet.</p>
                      ) : (
                        <ul className="grid gap-3 sm:grid-cols-2">
                          {approved.map((c) => {
                            const student = Array.isArray(c.student) ? c.student[0] : c.student
                            const showMatric = isAdmin || student?.id === viewer.id
                            return (
                              <li key={c.id}>
                                <Link
                                  href={`/candidates/${c.id}`}
                                  className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                                >
                                  <Avatar
                                    fullName={student?.full_name ?? 'Unknown'}
                                    avatarPath={student?.avatar_path ?? null}
                                    size="md"
                                  />
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                                      {student?.full_name ?? 'Unknown'}
                                    </div>
                                    <div className="truncate text-xs text-zinc-500">
                                      {showMatric ? student?.matric_no : null}
                                      {showMatric && student?.department ? ' · ' : ''}
                                      {student?.department ?? ''}
                                    </div>
                                  </div>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </section>
        )
      })}
    </div>
  )
}

type Badge = { state: 'open' | 'upcoming' | 'closed'; label: string; className: string }

// Human-readable status shown next to each election on the Candidates page so
// students know whether voting is open, coming up, or over.
function electionBadge(election: ElectionRow, now: number): Badge {
  const start = new Date(election.start_at).getTime()
  const end = new Date(election.end_at).getTime()
  const green =
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
  const amber = 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  const gray = 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'

  if (election.status === 'live') {
    if (now < start) {
      return {
        state: 'upcoming',
        label: `Voting opens ${formatDateTime(election.start_at)}`,
        className: amber,
      }
    }
    if (now >= end) {
      return { state: 'closed', label: 'Voting closed', className: gray }
    }
    return { state: 'open', label: 'Voting open', className: green }
  }
  if (election.status === 'closed') {
    return { state: 'closed', label: 'Closed', className: gray }
  }
  return { state: 'upcoming', label: 'Draft', className: gray }
}
