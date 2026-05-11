'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { castVoteSchema } from '@/lib/validation/votes'
import { extractClientIp, hashIp } from '@/lib/utils/ip-hash'
import { ok, err, type ActionResult, type ActionErrorCode } from '@/types/domain'

type CastVoteResponse =
  | { ok: true; vote_id: number }
  | { ok: false; error: 'unauthenticated' | 'election_not_live' | 'invalid_candidate' | 'already_voted' }

export async function castVote(
  input: z.input<typeof castVoteSchema>,
): Promise<ActionResult<{ voteId: number }>> {
  const parsed = castVoteSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const supabase = await createClient()
  const h = await headers()
  const ipHash = hashIp(extractClientIp(h))
  const userAgent = h.get('user-agent') ?? null

  const { data, error } = await supabase.rpc('cast_vote', {
    p_position_id: parsed.data.positionId,
    p_candidate_id: parsed.data.candidateId,
    p_ip_hash: ipHash,
    p_user_agent: userAgent ?? undefined,
  })

  if (error) return err('unknown', error.message)

  const result = data as unknown as CastVoteResponse
  if (!result.ok) {
    const mapped: ActionErrorCode =
      result.error === 'already_voted'
        ? 'already_voted'
        : result.error === 'election_not_live'
          ? 'election_not_live'
          : result.error === 'invalid_candidate'
            ? 'candidate_not_approved'
            : 'unauthenticated'
    return err(mapped)
  }

  revalidatePath('/ballot')
  revalidatePath('/feed')
  return ok({ voteId: result.vote_id })
}

// votes_read_self RLS policy lets the caller SELECT their own vote rows.
export async function getVotedPositionIds(electionId: number): Promise<number[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('votes')
    .select('position_id')
    .eq('election_id', electionId)
    .eq('student_id', user.id)

  return (data ?? []).map((row) => row.position_id)
}
