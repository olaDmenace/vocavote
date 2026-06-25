import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { PostCard, type FeedPost } from '@/components/feed/post-card'
import { PostModerationMenu } from '@/components/feed/post-moderation-menu'
import { DeletePostButton } from '@/components/feed/delete-post-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreatePostForm } from './create-post-form'

export default async function FeedPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  // Live election banner + ballot link
  const { data: liveElection } = await supabase
    .from('elections')
    .select('id, title, end_at')
    .eq('status', 'live')
    .maybeSingle()

  // Manifestos and discussion posts together, newest first.
  const { data: rawPosts } = await supabase
    .from('posts')
    .select(
      'id, type, title, body, created_at, candidate_id, author:profiles!posts_author_id_fkey(id, full_name, matric_no, avatar_path, role)',
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  // Pull position titles for manifestos for context.
  const candidateIds = (rawPosts ?? [])
    .map((p) => p.candidate_id)
    .filter((v): v is number => typeof v === 'number')
  const candidateToPosition = new Map<number, string>()
  if (candidateIds.length > 0) {
    const { data: cands } = await supabase
      .from('candidates')
      .select('id, position:positions(title)')
      .in('id', candidateIds)
    for (const c of cands ?? []) {
      const positionTitle = Array.isArray(c.position)
        ? c.position[0]?.title
        : (c.position as { title?: string } | null)?.title
      if (positionTitle) candidateToPosition.set(c.id, positionTitle)
    }
  }

  const posts: FeedPost[] = (rawPosts ?? []).map((p) => {
    const author = Array.isArray(p.author) ? p.author[0] : p.author
    return {
      id: p.id,
      type: p.type as FeedPost['type'],
      title: p.title,
      body: p.body,
      created_at: p.created_at,
      candidate_id: p.candidate_id,
      author: {
        id: author?.id ?? '',
        full_name: author?.full_name ?? 'Unknown',
        matric_no: author?.matric_no ?? '',
        avatar_path: author?.avatar_path ?? null,
        role: author?.role ?? 'student',
      },
      position_title: p.candidate_id ? candidateToPosition.get(p.candidate_id) ?? null : null,
    }
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
      <div className="flex flex-col gap-4">
        {liveElection ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {liveElection.title} is live
                </div>
                <div className="text-xs text-zinc-500">Cast your vote before it closes.</div>
              </div>
              <Link
                href={`/ballot/${liveElection.id}`}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Go to ballot
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Share a post</CardTitle>
          </CardHeader>
          <CardContent>
            <CreatePostForm />
          </CardContent>
        </Card>

        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id}>
              <PostCard
                post={post}
                showMatric={profile.role === 'admin' || post.author.id === profile.id}
                actions={
                  profile.role === 'admin' ? (
                    <PostModerationMenu postId={post.id} status="active" />
                  ) : post.author.id === profile.id ? (
                    <DeletePostButton postId={post.id} />
                  ) : undefined
                }
                footer={
                  <Link
                    href={
                      post.candidate_id
                        ? `/candidates/${post.candidate_id}`
                        : `/profile/${post.author.id}`
                    }
                    className="text-xs font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
                  >
                    {post.candidate_id ? 'View manifesto & comments →' : 'View author →'}
                  </Link>
                }
              />
            </div>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-zinc-500">
              The feed is empty. Be the first to post.
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="hidden flex-col gap-3 lg:flex">
        <Card>
          <CardHeader>
            <CardTitle>Your account</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
            <div>{profile.full_name}</div>
            <div className="text-xs">{profile.matric_no}</div>
            <Link
              href="/profile/edit"
              className="mt-2 inline-block text-xs font-medium underline-offset-4 hover:underline"
            >
              Edit profile
            </Link>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
