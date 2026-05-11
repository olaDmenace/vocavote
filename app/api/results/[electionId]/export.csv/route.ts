import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ electionId: string }> }

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) return `"${str.replaceAll('"', '""')}"`
  return str
}

export async function GET(_req: Request, { params }: Props) {
  const { electionId: rawId } = await params
  const electionId = Number(rawId)
  if (!Number.isFinite(electionId)) {
    return Response.json({ error: 'invalid_election_id' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('unauthorized', { status: 401 })

  const { data, error } = await supabase.rpc('results_csv', { p_election_id: electionId })
  if (error) return new Response(error.message, { status: 403 })
  if (!data || data.length === 0) {
    return new Response('No data. Results may not be published.', { status: 404 })
  }

  const header = ['Election', 'Position', 'Candidate', 'Vote count']
  const lines = [header.join(',')]
  for (const row of data) {
    lines.push(
      [row.election_title, row.position_title, row.candidate_name, row.vote_count]
        .map(csvEscape)
        .join(','),
    )
  }
  const csv = lines.join('\n') + '\n'

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="election-${electionId}-results.csv"`,
    },
  })
}
