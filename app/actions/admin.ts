'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import {
  createCandidateSchema,
  createElectionSchema,
  createPositionSchema,
  moderateCommentSchema,
  moderatePostSchema,
  setElectionStatusSchema,
  setUserActiveSchema,
  setUserRoleSchema,
} from '@/lib/validation/admin'
import { isSelfTargeted } from '@/lib/auth/is-self-targeted'
import { notify, notifyMany, studentRecipientIds } from '@/lib/notifications/create'
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

  // Announce to all students when voting opens.
  if (parsed.data.status === 'live') {
    const { data: el } = await ctx.supabase
      .from('elections')
      .select('title')
      .eq('id', parsed.data.id)
      .maybeSingle()
    const students = await studentRecipientIds()
    await notifyMany(students, {
      actorId: ctx.user.id,
      type: 'election_live',
      electionId: parsed.data.id,
      data: { election_title: el?.title ?? undefined },
    })
  }

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

  // Announce published results to all students.
  const { data: el } = await ctx.supabase
    .from('elections')
    .select('title')
    .eq('id', input.electionId)
    .maybeSingle()
  const students = await studentRecipientIds()
  await notifyMany(students, {
    actorId: ctx.user.id,
    type: 'results_published',
    electionId: input.electionId,
    data: { election_title: el?.title ?? undefined },
  })

  revalidatePath(`/elections/${input.electionId}`)
  revalidatePath(`/elections/${input.electionId}/tally`)
  revalidatePath(`/results/${input.electionId}`)
  return ok(undefined)
}

export async function deleteElection(input: {
  electionId: number
}): Promise<ActionResult> {
  const id = z.coerce.number().int().positive().safeParse(input.electionId)
  if (!id.success) return err('invalid_input')

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  // Positions → candidates cascade automatically. Votes use ON DELETE NO ACTION,
  // so an election with real ballots cannot be deleted (Postgres raises 23503).
  const { error } = await ctx.supabase.from('elections').delete().eq('id', id.data)
  if (error) {
    if (error.code === '23503') {
      return err(
        'forbidden',
        'This election has votes cast and cannot be deleted. Close it instead.',
      )
    }
    return err('unknown', error.message)
  }

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: 'election.delete',
    target_type: 'elections',
    target_id: id.data,
  })

  revalidatePath('/elections')
  revalidatePath('/dashboard')
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

  // Let the nominated student know.
  const { data: position } = await ctx.supabase
    .from('positions')
    .select('title')
    .eq('id', parsed.data.positionId)
    .maybeSingle()
  await notify({
    recipientId: parsed.data.studentId,
    actorId: ctx.user.id,
    type: 'candidacy_nominated',
    data: { position_title: position?.title ?? undefined, candidate_id: data.id },
  })

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

  // Let the candidate know they were approved.
  const { data: cand } = await ctx.supabase
    .from('candidates')
    .select('student_id, position:positions(title)')
    .eq('id', input.candidateId)
    .maybeSingle()
  if (cand?.student_id) {
    const position = Array.isArray(cand.position) ? cand.position[0] : cand.position
    await notify({
      recipientId: cand.student_id,
      actorId: ctx.user.id,
      type: 'candidacy_approved',
      data: { position_title: position?.title ?? undefined, candidate_id: input.candidateId },
    })
  }

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

export async function moderateComment(
  input: z.input<typeof moderateCommentSchema>,
): Promise<ActionResult> {
  const parsed = moderateCommentSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  const { error } = await ctx.supabase
    .from('comments')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.commentId)
  if (error) return err('unknown', error.message)

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: `comment.moderate.${parsed.data.status}`,
    target_type: 'comments',
    target_id: parsed.data.commentId,
  })

  revalidatePath('/feed')
  return ok(undefined)
}

export async function setUserRole(
  input: z.input<typeof setUserRoleSchema>,
): Promise<ActionResult> {
  const parsed = setUserRoleSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')
  if (isSelfTargeted(ctx.user.id, parsed.data.userId)) {
    return err('forbidden', 'You cannot change your own role.')
  }

  const { error } = await ctx.supabase
    .from('profiles')
    .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.userId)
  if (error) return err('unknown', error.message)

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: `user.role.${parsed.data.role}`,
    target_type: 'profiles',
    target_id: null,
    meta: { user_id: parsed.data.userId },
  })

  revalidatePath('/users')
  return ok(undefined)
}

export async function setUserActive(
  input: z.input<typeof setUserActiveSchema>,
): Promise<ActionResult> {
  const parsed = setUserActiveSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')
  if (isSelfTargeted(ctx.user.id, parsed.data.userId)) {
    return err('forbidden', 'You cannot suspend your own account.')
  }

  const { error } = await ctx.supabase
    .from('profiles')
    .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.userId)
  if (error) return err('unknown', error.message)

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: parsed.data.isActive ? 'user.reactivate' : 'user.suspend',
    target_type: 'profiles',
    target_id: null,
    meta: { user_id: parsed.data.userId },
  })

  revalidatePath('/users')
  return ok(undefined)
}
