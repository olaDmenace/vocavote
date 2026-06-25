import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { Avatar } from '@/components/profile/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelative } from '@/lib/utils/format'

type Props = { params: Promise<{ id: string }> }

export default async function ProfilePage({ params }: Props) {
  const { id } = await params

  const viewer = await requireProfile()
  const supabase = await createClient()

  const [{ data: profile }, { data: posts }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('posts')
      .select('id, type, title, created_at')
      .eq('author_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!profile) notFound()

  // Matric numbers are PII: visible only to admins or the profile owner.
  const canSeeMatric = viewer.role === 'admin' || viewer.id === profile.id
  const isAdminProfile = profile.role === 'admin'

  return (
    <div className="grid gap-6 md:grid-cols-[320px,1fr]">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <Avatar fullName={profile.full_name} avatarPath={profile.avatar_path} size="xl" />
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {profile.full_name}
            </h1>
            {canSeeMatric ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{profile.matric_no}</p>
            ) : null}
          </div>
          <dl className="w-full space-y-2 text-left text-sm">
            {!isAdminProfile ? (
              <>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Department</dt>
                  <dd className="text-zinc-800 dark:text-zinc-200">{profile.department}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Faculty</dt>
                  <dd className="text-zinc-800 dark:text-zinc-200">{profile.faculty}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Level</dt>
                  <dd className="text-zinc-800 dark:text-zinc-200">{profile.level}</dd>
                </div>
              </>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-zinc-500">Role</dt>
              <dd>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {profile.role}
                </span>
              </dd>
            </div>
          </dl>
          {profile.bio ? (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{profile.bio}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent posts</CardTitle>
        </CardHeader>
        <CardContent>
          {posts && posts.length > 0 ? (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {posts.map((p) => (
                <li key={p.id} className="py-2 text-sm">
                  <span className="mr-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {p.type}
                  </span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {p.title ?? '(untitled)'}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {formatRelative(p.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No posts yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
