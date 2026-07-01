import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { PostCard, type FeedPost } from '@/components/feed/post-card'
import { CommentThread, type FeedComment } from '@/components/feed/comments'
import { PostModerationMenu } from '@/components/feed/post-moderation-menu'
import { PostReactions } from '@/components/feed/post-reactions'
import { getReactionsForPosts } from '@/lib/reactions/fetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = { params: Promise<{ id: string }> }

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isFinite(postId)) notFound()

  const viewer = await requireProfile()
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('posts')
    .select(
      'id, type, title, body, created_at, candidate_id, author:profiles!posts_author_id_fkey(id, full_name, matric_no, avatar_path, role)',
    )
    .eq('id', postId)
    .eq('status', 'active')
    .maybeSingle()

  if (!raw) notFound()

  const author = Array.isArray(raw.author) ? raw.author[0] : raw.author
  const post: FeedPost = {
    id: raw.id,
    type: raw.type as FeedPost['type'],
    title: raw.title,
    body: raw.body,
    created_at: raw.created_at,
    candidate_id: raw.candidate_id,
    author: {
      id: author?.id ?? '',
      full_name: author?.full_name ?? 'Unknown',
      matric_no: author?.matric_no ?? '',
      avatar_path: author?.avatar_path ?? null,
      role: author?.role ?? 'student',
    },
  }

  const [{ data: rawComments }, reactionsMap] = await Promise.all([
    supabase
      .from('comments')
      .select(
        'id, body, created_at, author_id, author:profiles!comments_author_id_fkey(full_name, matric_no, avatar_path)',
      )
      .eq('post_id', postId)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    getReactionsForPosts(supabase, [postId], viewer.id),
  ])

  const comments: FeedComment[] = (rawComments ?? []).map((c) => {
    const a = Array.isArray(c.author) ? c.author[0] : c.author
    return {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author_id: c.author_id,
      author: {
        full_name: a?.full_name ?? 'Unknown',
        matric_no: a?.matric_no ?? '',
        avatar_path: a?.avatar_path ?? null,
      },
    }
  })

  const isAdmin = viewer.role === 'admin'
  const showMatric = isAdmin || post.author.id === viewer.id

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/feed" className="text-sm text-zinc-500 hover:underline">
        ← Back to feed
      </Link>

      <PostCard
        post={post}
        showMatric={showMatric}
        reactions={
          <PostReactions
            postId={post.id}
            initial={reactionsMap.get(post.id) ?? { likes: 0, dislikes: 0, mine: 0 }}
          />
        }
        actions={
          isAdmin ? <PostModerationMenu postId={post.id} status="active" /> : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Replies</CardTitle>
          <CardDescription>Join the conversation. Be respectful.</CardDescription>
        </CardHeader>
        <CardContent>
          <CommentThread
            postId={post.id}
            isAdmin={isAdmin}
            initialComments={comments}
            viewer={{
              id: viewer.id,
              full_name: viewer.full_name,
              matric_no: viewer.matric_no,
              avatar_path: viewer.avatar_path,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
