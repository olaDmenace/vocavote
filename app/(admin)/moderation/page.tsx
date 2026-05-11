import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ModeratePostButtons } from './moderate-post-buttons'
import { Markdown } from '@/components/feed/markdown'
import { formatRelative } from '@/lib/utils/format'

export default async function ModerationPage() {
  const supabase = await createClient()

  const [{ data: posts }, { data: audit }] = await Promise.all([
    supabase
      .from('posts')
      .select(
        'id, type, title, body, status, created_at, author:profiles!posts_author_id_fkey(id, full_name, matric_no)',
      )
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('audit_log')
      .select('id, action, target_type, target_id, created_at, actor:profiles!audit_log_actor_id_fkey(full_name, matric_no)')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Moderation
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Hide or restore posts. Audit log captures every admin action.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
          <CardDescription>Recent posts. Hidden posts are still listed here.</CardDescription>
        </CardHeader>
        <CardContent>
          {posts && posts.length > 0 ? (
            <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
              {posts.map((p) => {
                const author = Array.isArray(p.author) ? p.author[0] : p.author
                return (
                  <li key={p.id} className="flex flex-col gap-2 py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-sm">
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {author?.full_name ?? 'Unknown'}
                        </span>
                        <span className="ml-2 text-xs text-zinc-500">
                          {author?.matric_no}
                        </span>
                        <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {p.type}
                        </span>
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                            p.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">{formatRelative(p.created_at)}</span>
                    </div>
                    {p.title ? (
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {p.title}
                      </h3>
                    ) : null}
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                      <Markdown body={p.body.length > 400 ? p.body.slice(0, 400) + '…' : p.body} />
                    </div>
                    <ModeratePostButtons postId={p.id} status={p.status as 'active' | 'hidden' | 'deleted'} />
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No posts.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>
            Every admin action and vote cast. Newest first, last 50.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audit && audit.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Actor</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {audit.map((row) => {
                    const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor
                    return (
                      <tr key={row.id}>
                        <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                          {formatRelative(row.created_at)}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {actor?.full_name ?? 'system'}
                          </span>
                          {actor?.matric_no ? (
                            <span className="ml-1 text-xs text-zinc-500">
                              ({actor.matric_no})
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-4">
                          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                            {row.action}
                          </code>
                        </td>
                        <td className="py-2 text-xs text-zinc-500">
                          {row.target_type ? `${row.target_type}#${row.target_id}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No audit entries.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
