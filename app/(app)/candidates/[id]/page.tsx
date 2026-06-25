import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { PostCard, type FeedPost } from '@/components/feed/post-card'
import { CommentThread, type FeedComment } from '@/components/feed/comments'
import { PostModerationMenu } from '@/components/feed/post-moderation-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ManifestoEditor } from './manifesto-editor'

type Props = { params: Promise<{ id: string }> }

export default async function CandidatePage({ params }: Props) {
  const { id } = await params
  const candidateId = Number(id)
  if (!Number.isFinite(candidateId)) notFound()

  const viewer = await requireProfile()
  const supabase = await createClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select(
      'id, student_id, position_id, approved_at, manifesto_post_id, position:positions(title, election_id), student:profiles!candidates_student_id_fkey(id, full_name, matric_no, avatar_path, department, faculty, level, bio, role)',
    )
    .eq('id', candidateId)
    .maybeSingle()

  if (!candidate) notFound()

  const position = Array.isArray(candidate.position) ? candidate.position[0] : candidate.position
  const student = Array.isArray(candidate.student) ? candidate.student[0] : candidate.student
  if (!student) notFound()

  // Manifesto post (if any)
  let manifestoPost: FeedPost | null = null
  let manifestoComments: FeedComment[] = []
  if (candidate.manifesto_post_id) {
    const { data: post } = await supabase
      .from('posts')
      .select('id, type, title, body, created_at, candidate_id')
      .eq('id', candidate.manifesto_post_id)
      .eq('status', 'active')
      .maybeSingle()

    if (post) {
      manifestoPost = {
        id: post.id,
        type: post.type as FeedPost['type'],
        title: post.title,
        body: post.body,
        created_at: post.created_at,
        candidate_id: post.candidate_id,
        author: {
          id: student.id,
          full_name: student.full_name,
          matric_no: student.matric_no,
          avatar_path: student.avatar_path,
          role: student.role,
        },
        position_title: position?.title ?? null,
      }

      const { data: rawComments } = await supabase
        .from('comments')
        .select(
          'id, body, created_at, author_id, author:profiles!comments_author_id_fkey(full_name, matric_no, avatar_path)',
        )
        .eq('post_id', post.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })

      manifestoComments = (rawComments ?? []).map((c) => {
        const author = Array.isArray(c.author) ? c.author[0] : c.author
        return {
          id: c.id,
          body: c.body,
          created_at: c.created_at,
          author_id: c.author_id,
          author: {
            full_name: author?.full_name ?? 'Unknown',
            matric_no: author?.matric_no ?? '',
            avatar_path: author?.avatar_path ?? null,
          },
        }
      })
    }
  }

  const isOwner = viewer.id === student.id
  const canEditManifesto = isOwner && candidate.approved_at !== null

  return (
    <div className="grid gap-6 md:grid-cols-[320px,1fr]">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <Link
            href={`/profile/${student.id}`}
            className="text-lg font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
          >
            {student.full_name}
          </Link>
          <p className="text-sm text-zinc-500">{student.matric_no}</p>
          {position?.title ? (
            <p className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              Running for {position.title}
            </p>
          ) : null}
          {!candidate.approved_at ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Pending admin approval.
            </p>
          ) : null}
          <dl className="w-full space-y-2 text-left text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Department</dt>
              <dd className="text-zinc-800 dark:text-zinc-200">{student.department}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Faculty</dt>
              <dd className="text-zinc-800 dark:text-zinc-200">{student.faculty}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Level</dt>
              <dd className="text-zinc-800 dark:text-zinc-200">{student.level}</dd>
            </div>
          </dl>
          {student.bio ? (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{student.bio}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {canEditManifesto ? (
          <Card>
            <CardHeader>
              <CardTitle>{manifestoPost ? 'Update manifesto' : 'Publish your manifesto'}</CardTitle>
              <CardDescription>Markdown supported. Voters see this on the ballot.</CardDescription>
            </CardHeader>
            <CardContent>
              <ManifestoEditor
                candidateId={candidate.id}
                existingPostId={manifestoPost?.id ?? null}
                initialTitle={manifestoPost?.title ?? ''}
                initialBody={manifestoPost?.body ?? ''}
              />
            </CardContent>
          </Card>
        ) : null}

        {manifestoPost ? (
          <>
            <PostCard
              post={manifestoPost}
              actions={
                viewer.role === 'admin' ? (
                  <PostModerationMenu postId={manifestoPost.id} status="active" />
                ) : undefined
              }
            />
            <Card>
              <CardHeader>
                <CardTitle>Discussion</CardTitle>
                <CardDescription>
                  Ask questions, share concerns. Be respectful.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CommentThread
                  postId={manifestoPost.id}
                  isAdmin={viewer.role === 'admin'}
                  initialComments={manifestoComments}
                  viewer={{
                    id: viewer.id,
                    full_name: viewer.full_name,
                    matric_no: viewer.matric_no,
                    avatar_path: viewer.avatar_path,
                  }}
                />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-zinc-500">
              No manifesto published yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
