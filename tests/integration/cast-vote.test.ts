/**
 * Integration test: cast_vote concurrency + RLS enforcement on votes.
 *
 * Skipped automatically when the Supabase env vars are missing — keeps
 * `npm test` green in environments without a project.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { matricToEmail } from '@/lib/auth/matric-to-email'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const shouldRun =
  Boolean(url) &&
  Boolean(anonKey) &&
  Boolean(serviceRoleKey) &&
  serviceRoleKey !== 'PASTE_SERVICE_ROLE_KEY_HERE'

const STUDENT_MATRIC = 'CSC/2019/049'
const STUDENT_PASSWORD = 'Student#1234'

describe.runIf(shouldRun)('cast_vote (integration)', () => {
  let userClient: SupabaseClient
  let adminClient: SupabaseClient
  let positionId: number
  let candidateId: number
  let studentId: string

  beforeAll(async () => {
    adminClient = createClient(url!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    userClient = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: signIn, error } = await userClient.auth.signInWithPassword({
      email: matricToEmail(STUDENT_MATRIC),
      password: STUDENT_PASSWORD,
    })
    if (error) throw error
    if (!signIn.user) throw new Error('no user after sign-in')
    studentId = signIn.user.id

    // Pick the first approved candidate from a position the student hasn't
    // voted on yet. Skip positions where they're a candidate (can't vote for
    // themselves doesn't matter, but keep the test stable).
    const { data: election } = await adminClient
      .from('elections')
      .select('id, start_at, end_at')
      .eq('status', 'live')
      .maybeSingle()
    if (!election) throw new Error('No live election found')

    // Guard against stale seed data: `cast_vote` gates on the time window, not
    // just status='live'. If the seeded window has expired, every cast returns
    // `election_not_live` and the assertions fail with a cryptic mismatch.
    // Fail loudly here with the actual cause instead.
    const now = Date.now()
    const startAt = new Date(election.start_at).getTime()
    const endAt = new Date(election.end_at).getTime()
    if (now < startAt || now >= endAt) {
      throw new Error(
        `Live election ${election.id} window does not cover now ` +
          `(${election.start_at} … ${election.end_at}). ` +
          `Re-seed or extend end_at — cast_vote will return election_not_live.`,
      )
    }

    const { data: positions } = await adminClient
      .from('positions')
      .select('id')
      .eq('election_id', election.id)
      .order('display_order')

    for (const p of positions ?? []) {
      const { data: voted } = await adminClient
        .from('votes')
        .select('id')
        .eq('position_id', p.id)
        .eq('student_id', studentId)
        .maybeSingle()
      if (voted) continue

      const { data: candidate } = await adminClient
        .from('candidates')
        .select('id')
        .eq('position_id', p.id)
        .not('approved_at', 'is', null)
        .neq('student_id', studentId)
        .limit(1)
        .maybeSingle()
      if (candidate) {
        positionId = p.id
        candidateId = candidate.id
        break
      }
    }
    if (!positionId || !candidateId) {
      throw new Error('Could not find an unvoted position for the test student.')
    }
  })

  afterAll(async () => {
    if (adminClient && studentId && positionId) {
      // Clean up the vote so the test is re-runnable.
      await adminClient
        .from('votes')
        .delete()
        .eq('student_id', studentId)
        .eq('position_id', positionId)
    }
    if (userClient) await userClient.auth.signOut()
  })

  it('admits exactly one vote when fired 50× in parallel', async () => {
    const calls = Array.from({ length: 50 }, () =>
      userClient.rpc('cast_vote', {
        p_position_id: positionId,
        p_candidate_id: candidateId,
      }),
    )
    const results = await Promise.all(calls)

    type CastVoteResp = { ok: boolean; vote_id?: number; error?: string }

    let successes = 0
    let alreadyVoted = 0
    let other = 0
    for (const { data, error } of results) {
      if (error) {
        other += 1
        continue
      }
      const payload = data as unknown as CastVoteResp
      if (payload.ok) successes += 1
      else if (payload.error === 'already_voted') alreadyVoted += 1
      else other += 1
    }

    expect(other).toBe(0)
    expect(successes).toBe(1)
    expect(alreadyVoted).toBe(49)

    const { count } = await adminClient
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('position_id', positionId)
    expect(count).toBe(1)
  })
})

describe.runIf(shouldRun)('RLS on votes (integration)', () => {
  it('hides other students\' votes from a logged-in student', async () => {
    const userClient = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const adminClient = createClient(url!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: signIn, error } = await userClient.auth.signInWithPassword({
      email: matricToEmail('CSC/2019/001'),
      password: 'Student#1234',
    })
    if (error) throw error
    const myId = signIn.user?.id

    const { data: visible } = await userClient.from('votes').select('id, student_id').limit(50)

    // Should only see rows where student_id = myself (or none at all if no votes).
    for (const row of visible ?? []) {
      expect(row.student_id).toBe(myId)
    }

    // Admin sees more (or at least equal) than the student does.
    const { count: adminCount } = await adminClient
      .from('votes')
      .select('*', { count: 'exact', head: true })
    const studentCount = (visible ?? []).length
    expect(adminCount ?? 0).toBeGreaterThanOrEqual(studentCount)

    await userClient.auth.signOut()
  })

  it('blocks direct INSERT into votes with a student JWT', async () => {
    const userClient = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: matricToEmail('CSC/2019/002'),
      password: 'Student#1234',
    })
    if (signInError) throw signInError

    const { error } = await userClient.from('votes').insert({
      election_id: 1,
      position_id: 1,
      candidate_id: 1,
      student_id: '00000000-0000-0000-0000-000000000000',
    })
    expect(error).toBeTruthy()
    await userClient.auth.signOut()
  })
})
