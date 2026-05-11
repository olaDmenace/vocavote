'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import {
  createCommentSchema,
  createPostSchema,
  updateManifestoSchema,
} from '@/lib/validation/posts'
import { ok, err, type ActionResult } from '@/types/domain'

export async function createPost(
  input: z.input<typeof createPostSchema>,
): Promise<ActionResult<{ postId: number }>> {
  const parsed = createPostSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      type: parsed.data.type,
      title: parsed.data.title ?? null,
      body: parsed.data.body,
      candidate_id: parsed.data.candidateId ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    // The posts_insert_self RLS check disallows manifesto by non-approved candidates.
    return err('forbidden', error?.message ?? 'Could not create post.')
  }

  if (parsed.data.type === 'manifesto' && parsed.data.candidateId) {
    await supabase
      .from('candidates')
      .update({ manifesto_post_id: data.id })
      .eq('id', parsed.data.candidateId)
      .eq('student_id', user.id)
  }

  revalidatePath('/feed')
  if (parsed.data.candidateId) {
    revalidatePath(`/candidates/${parsed.data.candidateId}`)
  }
  return ok({ postId: data.id })
}

export async function updateManifesto(
  input: z.input<typeof updateManifestoSchema>,
): Promise<ActionResult> {
  const parsed = updateManifestoSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  const { error } = await supabase
    .from('posts')
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.postId)
    .eq('author_id', user.id)
    .eq('type', 'manifesto')
  if (error) return err('unknown', error.message)

  revalidatePath('/feed')
  return ok(undefined)
}

export async function createComment(
  input: z.input<typeof createCommentSchema>,
): Promise<ActionResult<{ commentId: number; createdAt: string }>> {
  const parsed = createCommentSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: parsed.data.postId,
      author_id: user.id,
      body: parsed.data.body,
    })
    .select('id, created_at')
    .single()
  if (error || !data) return err('unknown', error?.message ?? 'Could not post comment.')

  return ok({ commentId: data.id, createdAt: data.created_at })
}
