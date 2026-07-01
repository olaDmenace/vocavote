import { requireProfile } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { NotificationList } from '@/components/nav/notification-list'
import type { NotificationRow } from '@/lib/notifications/render'

export default async function NotificationsPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  const { data } = await supabase
    .from('notifications')
    .select('id, type, actor_id, post_id, comment_id, election_id, data, read_at, created_at')
    .eq('recipient_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="mx-auto max-w-2xl">
      <NotificationList initialItems={(data ?? []) as NotificationRow[]} />
    </div>
  )
}
