import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityLog, type ActivityRow } from './activity-log'

export default async function ActivityPage() {
  const supabase = await createClient()

  const { data: audit } = await supabase
    .from('audit_log')
    .select(
      'id, action, target_type, target_id, created_at, actor:profiles!audit_log_actor_id_fkey(full_name, matric_no)',
    )
    .order('created_at', { ascending: false })
    .limit(200)

  const rows: ActivityRow[] = (audit ?? []).map((r) => {
    const actor = Array.isArray(r.actor) ? r.actor[0] : r.actor
    return {
      id: r.id,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      createdAt: r.created_at,
      actorName: actor?.full_name ?? 'system',
      actorMatric: actor?.matric_no ?? null,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Activity log
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Every admin action and vote cast, for transparency and tracking. Newest first, last 200.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Admin activity</CardTitle>
          <CardDescription>Filter by category or search by action / actor.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <ActivityLog rows={rows} />
          ) : (
            <p className="text-sm text-zinc-500">No activity yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
