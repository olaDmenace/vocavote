import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { ReactionState } from '@/app/actions/posts'

/**
 * Batch-fetch like/dislike tallies for a set of posts plus the viewer's own
 * reaction. Defensive by design: if the `post_reactions` table isn't present
 * yet (migration not applied), it returns zeroed state so the feed still works.
 */
export async function getReactionsForPosts(
  supabase: SupabaseClient<Database>,
  postIds: number[],
  userId: string | null,
): Promise<Map<number, ReactionState>> {
  const map = new Map<number, ReactionState>()
  for (const id of postIds) map.set(id, { likes: 0, dislikes: 0, mine: 0 })
  if (postIds.length === 0) return map

  const { data, error } = await supabase
    .from('post_reactions')
    .select('post_id, value, user_id')
    .in('post_id', postIds)

  if (error || !data) return map

  for (const r of data) {
    const entry = map.get(r.post_id)
    if (!entry) continue
    if (r.value === 1) entry.likes++
    else if (r.value === -1) entry.dislikes++
    if (userId && r.user_id === userId) entry.mine = r.value as 1 | -1
  }
  return map
}
