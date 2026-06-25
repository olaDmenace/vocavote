import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { Avatar } from '@/components/profile/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CandidatesPage() {
  await requireProfile()
  const supabase = await createClient()

  // Prefer the live election; otherwise the most recent one.
  const { data: live } = await supabase
    .from('elections')
    .select('id, title, status')
    .eq('status', 'live')
    .maybeSingle()

  let election = live
  if (!election) {
    const { data: recent } = await supabase
      .from('elections')
      .select('id, title, status')
      .order('start_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    election = recent
  }

  if (!election) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-zinc-500">
          No election to show yet.
        </CardContent>
      </Card>
    )
  }

  const { data: positions } = await supabase
    .from('positions')
    .select(
      'id, title, description, display_order, candidates(id, approved_at, student:profiles!candidates_student_id_fkey(id, full_name, matric_no, avatar_path, department))',
    )
    .eq('election_id', election.id)
    .order('display_order')
    .order('id')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Candidates
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{election.title}</p>
        </div>
        {election.status === 'live' ? (
          <Link
            href={`/ballot/${election.id}`}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Go to ballot
          </Link>
        ) : null}
      </header>

      {(positions ?? []).map((position) => {
        const approved = (position.candidates ?? []).filter((c) => c.approved_at !== null)
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
                              {student?.matric_no}
                              {student?.department ? ` · ${student.department}` : ''}
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
      })}
    </div>
  )
}
