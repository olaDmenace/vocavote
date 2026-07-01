'use server'

import { createClient } from '@/lib/supabase/server'
import { ok, err, type ActionResult } from '@/types/domain'

export async function markNotificationRead(input: { id: number }): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', input.id)
    .eq('recipient_id', user.id)
    .is('read_at', null)
  if (error) return err('unknown', error.message)
  return ok(undefined)
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthenticated')

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null)
  if (error) return err('unknown', error.message)
  return ok(undefined)
}
