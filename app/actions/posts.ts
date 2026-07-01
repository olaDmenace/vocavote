'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify, adminRecipientIds } from '@/lib/notifications/create'
import {
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_MIME_WHITELIST,
  createCommentSchema,
  createPostSchema,
  updateManifestoSchema,
} from '@/lib/validation/posts'
import { ok, err, type ActionResult } from '@/types/domain'

const EXT_BY_MIME: Record<(typeof POST_IMAGE_MIME_WHITELIST)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function uploadPostImage(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const file = formData.get('image')
  if (!(file instanceof File)) return err('invalid_input', 'No image provided.')
  if (file.size === 0) return err('invalid_input', 'Pick an image first.')
  if (file.size > POST_IMAGE_MAX_BYTES) {
    return err('invalid_input', 'Image must be 5 MB or smaller.')
  }
  if (!POST_IMAGE_MIME_WHITELIST.includes(file.type as (typeof POST_IMAGE_MIME_WHITELIST)[number])) {
    return err('invalid_input', 'Image must be JPG, PNG, WebP, or GIF.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  const ext = EXT_BY_MIME[file.type as (typeof POST_IMAGE_MIME_WHITELIST)[number]]
  // Folder = uid so the path is scoped to this user.
  const path = `${user.id}/${Date.now()}-${Math.round(file.size)}.${ext}`

  // Use the service-role client for the upload: the user-scoped SSR client
  // doesn't satisfy the post-media owner-folder policy from a server action.
  // The path is server-controlled to the user's own folder, so this is safe.
  const admin = createAdminClient()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await admin.storage
    .from('post-media')
    .upload(path, bytes, { contentType: file.type, cacheControl: '3600' })
  if (uploadError) return err('unknown', uploadError.message)

  const {
    data: { publicUrl },
  } = admin.storage.from('post-media').getPublicUrl(path)
  return ok({ url: publicUrl })
}

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
    // Students intentionally have no UPDATE policy on `candidates` (it would let
    // them self-approve via approved_at). Persist just the manifesto link through
    // the service-role client, scoped to the user's own candidate row.
    const admin = createAdminClient()
    await admin
      .from('candidates')
      .update({ manifesto_post_id: data.id })
      .eq('id', parsed.data.candidateId)
      .eq('student_id', user.id)
  }

  // Notify admins of new posts (for moderation / awareness).
  const [{ data: actor }, admins] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    adminRecipientIds(),
  ])
  await Promise.all(
    admins.map((adminId) =>
      notify({
        recipientId: adminId,
        actorId: user.id,
        type: 'new_post',
        postId: data.id,
        data: {
          actor_name: actor?.full_name ?? 'Someone',
          is_manifesto: parsed.data.type === 'manifesto',
          candidate_id: parsed.data.candidateId ?? undefined,
        },
      }),
    ),
  )

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

export async function deletePost(input: {
  postId: number
}): Promise<ActionResult> {
  const postId = z.coerce.number().int().positive().safeParse(input.postId)
  if (!postId.success) return err('invalid_input')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  // RLS posts_update_self only lets the author touch their own rows, so the
  // author_id filter is enforced both here and in the database.
  const { error } = await supabase
    .from('posts')
    .update({ status: 'deleted', updated_at: new Date().toISOString() })
    .eq('id', postId.data)
    .eq('author_id', user.id)
  if (error) return err('unknown', error.message)

  revalidatePath('/feed')
  revalidatePath(`/profile/${user.id}`)
  return ok(undefined)
}

const reactSchema = z.object({
  postId: z.coerce.number().int().positive(),
  value: z.union([z.literal(1), z.literal(-1)]),
})

export type ReactionState = { likes: number; dislikes: number; mine: 1 | -1 | 0 }

export async function react(
  input: z.input<typeof reactSchema>,
): Promise<ActionResult<ReactionState>> {
  const parsed = reactSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  const { postId, value } = parsed.data

  const { data: existing } = await supabase
    .from('post_reactions')
    .select('value')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  let cleared = false
  if (existing && existing.value === value) {
    // Clicking the same side again clears the reaction.
    cleared = true
    const { error } = await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
    if (error) return err('unknown', error.message)
  } else {
    const { error } = await supabase
      .from('post_reactions')
      .upsert({ post_id: postId, user_id: user.id, value }, { onConflict: 'post_id,user_id' })
    if (error) return err('unknown', error.message)
  }

  // Notify the post author when a like/dislike is set (not when cleared).
  if (!cleared) {
    const [{ data: post }, { data: actor }] = await Promise.all([
      supabase.from('posts').select('author_id, candidate_id').eq('id', postId).maybeSingle(),
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    ])
    if (post?.author_id) {
      await notify({
        recipientId: post.author_id,
        actorId: user.id,
        type: value === 1 ? 'reaction_like' : 'reaction_dislike',
        postId,
        data: {
          actor_name: actor?.full_name ?? 'Someone',
          candidate_id: post.candidate_id ?? undefined,
        },
      })
    }
  }

  const { data: rows } = await supabase
    .from('post_reactions')
    .select('value, user_id')
    .eq('post_id', postId)

  let likes = 0
  let dislikes = 0
  let mine: 1 | -1 | 0 = 0
  for (const r of rows ?? []) {
    if (r.value === 1) likes++
    else if (r.value === -1) dislikes++
    if (r.user_id === user.id) mine = r.value as 1 | -1
  }

  revalidatePath('/feed')
  return ok({ likes, dislikes, mine })
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

  // Notify the post author of the reply (best effort).
  const [{ data: post }, { data: actor }] = await Promise.all([
    supabase
      .from('posts')
      .select('author_id, type, candidate_id, title')
      .eq('id', parsed.data.postId)
      .maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ])
  if (post?.author_id) {
    await notify({
      recipientId: post.author_id,
      actorId: user.id,
      type: 'reply',
      postId: parsed.data.postId,
      commentId: data.id,
      data: {
        actor_name: actor?.full_name ?? 'Someone',
        is_manifesto: post.type === 'manifesto',
        candidate_id: post.candidate_id ?? undefined,
        post_title: post.title ?? undefined,
      },
    })
  }

  return ok({ commentId: data.id, createdAt: data.created_at })
}
