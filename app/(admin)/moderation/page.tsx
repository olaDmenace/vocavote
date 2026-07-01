import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PostsModeration, type ModerationPost } from './posts-moderation'

export default async function ModerationPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select(
      'id, type, title, body, status, created_at, author:profiles!posts_author_id_fkey(full_name, matric_no)',
    )
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .limit(100)

  const rows: ModerationPost[] = (posts ?? []).map((p) => {
    const author = Array.isArray(p.author) ? p.author[0] : p.author
    return {
      id: p.id,
      type: p.type,
      title: p.title,
      body: p.body,
      status: p.status as ModerationPost['status'],
      created_at: p.created_at,
      authorName: author?.full_name ?? 'Unknown',
      authorMatric: author?.matric_no ?? '',
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Moderation
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Hide or restore posts. Admin actions are recorded on the{' '}
          <Link href="/activity" className="font-medium underline-offset-4 hover:underline">
            Activity log
          </Link>
          .
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
          <CardDescription>Recent posts. Hidden posts are still listed here.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <PostsModeration posts={rows} />
          ) : (
            <p className="text-sm text-zinc-500">No posts.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
