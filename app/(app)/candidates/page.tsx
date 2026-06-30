import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { Avatar } from '@/components/profile/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ElectionRow = { id: number; title: string; status: string }

export default async function CandidatesPage() {
  const viewer = await requireProfile()
  const supabase = await createClient()

  // Show every live election. Only fall back to the most recent election when
  // none are live, so the page works whether there are 0, 1, or several live.
  const { data: liveElections } = await supabase
    .from('elections')
    .select('id, title, status')
    .eq('status', 'live')
    .order('start_at', { ascending: false })

  let elections: ElectionRow[] = liveElections ?? []
  if (elections.length === 0) {
    const { data: recent } = await supabase
      .from('elections')
      .select('id, title, status')
      .order('start_at', { ascending: false })
      .limit(1)
    elections = recent ?? []
  }

  if (elections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-zinc-500">
          No election to show yet.
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
        return (
          <section key={election.id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {election.title}
              </h2>
              {election.status === 'live' ? (
                <Link
                  href={`/ballot/${election.id}`}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Go to ballot
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
