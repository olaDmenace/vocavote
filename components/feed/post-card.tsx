import Link from 'next/link'
import { Avatar } from '@/components/profile/avatar'
import { Markdown } from '@/components/feed/markdown'
import { formatRelative } from '@/lib/utils/format'

export type FeedPost = {
  id: number
  type: 'manifesto' | 'discussion'
  title: string | null
  body: string
  created_at: string
  candidate_id: number | null
  author: {
    id: string
    full_name: string
    matric_no: string
    avatar_path: string | null
    role: string
  }
  position_title?: string | null
}

export function PostCard({
  post,
  footer,
  actions,
  showMatric = false,
}: {
  post: FeedPost
  footer?: React.ReactNode
  actions?: React.ReactNode
  /** Matric numbers are PII — only admins (or the author themselves) see them. */
  showMatric?: boolean
}) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex items-center gap-3">
        <Avatar
          fullName={post.author.full_name}
          avatarPath={post.author.avatar_path}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/profile/${post.author.id}`}
              className="truncate font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              {post.author.full_name}
            </Link>
            {showMatric ? (
              <span className="truncate text-xs text-zinc-500">{post.author.matric_no}</span>
            ) : null}
          </div>
          <div className="text-xs text-zinc-500">
            {formatRelative(post.created_at)}
            {post.type === 'manifesto' ? (
              <>
                {' · '}
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs font-medium uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Manifesto
                </span>
                {post.position_title ? <span> · {post.position_title}</span> : null}
              </>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>

      {post.title ? (
        <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {post.title}
        </h3>
      ) : null}

      <div className="mt-2">
        <Markdown body={post.body} />
      </div>

      {footer ? <div className="mt-3">{footer}</div> : null}
    </article>
  )
}
