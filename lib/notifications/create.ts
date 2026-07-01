import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type NotificationType =
  | 'reply' // someone replied to your post/manifesto
  | 'reaction_like' // someone liked your post
  | 'reaction_dislike' // someone disliked your post
  | 'new_post' // (admins) a new post was created
  | 'candidacy_nominated' // you were nominated as a candidate
  | 'candidacy_approved' // your candidacy was approved
  | 'election_live' // voting opened for an election
  | 'results_published' // results were published

type NotifyData = Record<string, string | number | boolean | null | undefined>

type NotifyInput = {
  recipientId: string
  actorId?: string | null
  type: NotificationType
  postId?: number | null
  commentId?: number | null
  electionId?: number | null
  data?: NotifyData
}

function toRow(input: NotifyInput) {
  return {
    recipient_id: input.recipientId,
    actor_id: input.actorId ?? null,
    type: input.type,
    post_id: input.postId ?? null,
    comment_id: input.commentId ?? null,
    election_id: input.electionId ?? null,
    data: input.data ?? {},
  }
}

// Notifications are best-effort: a failure here must never break the action
// that triggered it. Inserts use the service-role client because a user's
// action creates rows owned by *other* users (RLS blocks that for the user).
export async function notify(input: NotifyInput): Promise<void> {
  if (input.actorId && input.actorId === input.recipientId) return
  try {
    const admin = createAdminClient()
    await admin.from('notifications').insert(toRow(input))
  } catch {
    // swallow — best effort
  }
}

export async function notifyMany(
  recipientIds: string[],
  base: Omit<NotifyInput, 'recipientId'>,
): Promise<void> {
  const rows = recipientIds
    .filter((id) => !(base.actorId && base.actorId === id))
    .map((id) => toRow({ ...base, recipientId: id }))
  if (rows.length === 0) return
  try {
    const admin = createAdminClient()
    await admin.from('notifications').insert(rows)
  } catch {
    // swallow — best effort
  }
}

/** Recipient ids of all admins (for moderation-style notifications). */
export async function adminRecipientIds(): Promise<string[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('profiles').select('id').eq('role', 'admin')
    return (data ?? []).map((r) => r.id)
  } catch {
    return []
  }
}

/** Recipient ids of all active students (for announcements). */
export async function studentRecipientIds(): Promise<string[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .eq('is_active', true)
    return (data ?? []).map((r) => r.id)
  } catch {
    return []
  }
}
