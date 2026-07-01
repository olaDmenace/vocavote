export type NotificationRow = {
  id: number
  type: string
  actor_id: string | null
  post_id: number | null
  comment_id: number | null
  election_id: number | null
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

/** Human-readable text + destination for a notification row. */
export function renderNotification(n: NotificationRow): { text: string; href: string } {
  const data = (n.data ?? {}) as Record<string, string | number | boolean | undefined>
  const actor = (data.actor_name as string) || 'Someone'
  const candidateId = data.candidate_id
  const postHref = candidateId
    ? `/candidates/${candidateId}`
    : n.post_id
      ? `/posts/${n.post_id}`
      : '/feed'

  switch (n.type) {
    case 'reply':
      return {
        text: `${actor} replied to your ${data.is_manifesto ? 'manifesto' : 'post'}`,
        href: postHref,
      }
    case 'reaction_like':
      return { text: `${actor} liked your post`, href: postHref }
    case 'reaction_dislike':
      return { text: `${actor} disliked your post`, href: postHref }
    case 'new_post':
      return { text: `${actor} shared a new post`, href: postHref }
    case 'candidacy_nominated':
      return {
        text: `You were nominated for ${data.position_title ?? 'a position'}`,
        href: candidateId ? `/candidates/${candidateId}` : '/candidates',
      }
    case 'candidacy_approved':
      return {
        text: `Your candidacy for ${data.position_title ?? 'a position'} was approved`,
        href: candidateId ? `/candidates/${candidateId}` : '/candidates',
      }
    case 'election_live':
      return {
        text: `${data.election_title ?? 'An election'} is now live — meet the candidates and read their manifestos`,
        href: '/candidates',
      }
    case 'results_published':
      return {
        text: `Results published for ${data.election_title ?? 'an election'}`,
        href: n.election_id ? `/results/${n.election_id}` : '/feed',
      }
    default:
      return { text: 'New notification', href: '/feed' }
  }
}
