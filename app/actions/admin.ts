'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import {
  createCandidateSchema,
  createElectionSchema,
  createPositionSchema,
  moderatePostSchema,
  setElectionStatusSchema,
} from '@/lib/validation/admin'
import { ok, err, type ActionResult } from '@/types/domain'

async function requireAdminClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, supabase, user: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') {
    return { ok: false as const, supabase, user }
  }
  return { ok: true as const, supabase, user, profile }
}

export async function createElection(
  input: z.input<typeof createElectionSchema>,
): Promise<ActionResult<{ id: number }>> {
  const parsed = createElectionSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  const { data, error } = await ctx.supabase
    .from('elections')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      start_at: parsed.data.startAt,
      end_at: parsed.data.endAt,
      created_by: ctx.user.id,
    })
    .select('id')
    .single()
  if (error || !data) return err('unknown', error?.message ?? 'Failed to create election.')

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: 'election.create',
    target_type: 'elections',
    target_id: data.id,
    meta: { title: parsed.data.title },
  })

  revalidatePath('/elections')
  revalidatePath('/dashboard')
  return ok({ id: data.id })
}

export async function setElectionStatus(
  input: z.input<typeof setElectionStatusSchema>,
): Promise<ActionResult> {
  const parsed = setElectionStatusSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  const { error } = await ctx.supabase
    .from('elections')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id)
  if (error) return err('unknown', error.message)

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: `election.status.${parsed.data.status}`,
    target_type: 'elections',
    target_id: parsed.data.id,
  })

  revalidatePath('/elections')
  revalidatePath(`/elections/${parsed.data.id}`)
  revalidatePath('/dashboard')
  revalidatePath('/feed')
  return ok(undefined)
}

export async function publishResults(input: {
  electionId: number
}): Promise<ActionResult> {
  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  const { error } = await ctx.supabase
    .from('elections')
    .update({
      results_published: true,
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.electionId)
  if (error) return err('unknown', error.message)

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: 'results.publish',
    target_type: 'elections',
    target_id: input.electionId,
  })

  revalidatePath(`/elections/${input.electionId}`)
  revalidatePath(`/elections/${input.electionId}/tally`)
  revalidatePath(`/results/${input.electionId}`)
  return ok(undefined)
}

export async function createPosition(
  input: z.input<typeof createPositionSchema>,
): Promise<ActionResult<{ id: number }>> {
  const parsed = createPositionSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  const { data, error } = await ctx.supabase
    .from('positions')
    .insert({
      election_id: parsed.data.electionId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      display_order: parsed.data.displayOrder,
    })
    .select('id')
    .single()
  if (error || !data) return err('unknown', error?.message ?? 'Failed to add position.')

  revalidatePath(`/elections/${parsed.data.electionId}`)
  return ok({ id: data.id })
}

export async function nominateCandidate(
  input: z.input<typeof createCandidateSchema>,
): Promise<ActionResult<{ id: number }>> {
  const parsed = createCandidateSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  const { data, error } = await ctx.supabase
    .from('candidates')
    .insert({
      student_id: parsed.data.studentId,
      position_id: parsed.data.positionId,
    })
    .select('id')
    .single()
  if (error || !data) {
    if (error?.code === '23505') {
      return err('invalid_input', 'That student is already a candidate for this position.')
    }
    return err('unknown', error?.message ?? 'Failed to add candidate.')
  }

  revalidatePath('/elections')
  return ok({ id: data.id })
}

export async function approveCandidate(input: {
  candidateId: number
}): Promise<ActionResult> {
  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  const { error } = await ctx.supabase
    .from('candidates')
    .update({ approved_at: new Date().toISOString(), approved_by: ctx.user.id })
    .eq('id', input.candidateId)
  if (error) return err('unknown', error.message)

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: 'candidate.approve',
    target_type: 'candidates',
    target_id: input.candidateId,
  })

  revalidatePath('/elections')
  return ok(undefined)
}

export async function revokeCandidate(input: {
  candidateId: number
}): Promise<ActionResult> {
  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  const { error } = await ctx.supabase
    .from('candidates')
    .update({ approved_at: null, approved_by: null })
    .eq('id', input.candidateId)
  if (error) return err('unknown', error.message)

  revalidatePath('/elections')
  return ok(undefined)
}

export async function moderatePost(
  input: z.input<typeof moderatePostSchema>,
): Promise<ActionResult> {
  const parsed = moderatePostSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  const { error } = await ctx.supabase
    .from('posts')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.postId)
  if (error) return err('unknown', error.message)

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: `post.moderate.${parsed.data.status}`,
    target_type: 'posts',
    target_id: parsed.data.postId,
  })

  revalidatePath('/feed')
  revalidatePath('/moderation')
  return ok(undefined)
}
