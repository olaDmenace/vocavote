'use client'

import { useMemo, useState } from 'react'
import { ModeratePostButtons } from './moderate-post-buttons'
import { Markdown } from '@/components/feed/markdown'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatRelative } from '@/lib/utils/format'

export type ModerationPost = {
  id: number
  type: string
  title: string | null
  body: string
  status: 'active' | 'hidden' | 'deleted'
  created_at: string
  authorName: string
  authorMatric: string
}

export function PostsModeration({ posts }: { posts: ModerationPost[] }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'hidden'>('all')
  const [type, setType] = useState<'all' | 'discussion' | 'manifesto'>('all')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return posts.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (type !== 'all' && p.type !== type) return false
      if (
        s &&
        !`${p.authorName} ${p.authorMatric} ${p.title ?? ''} ${p.body}`
          .toLowerCase()
          .includes(s)
      )
        return false
      return true
    })
  }, [posts, q, status, type])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search author or content…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="max-w-[10rem]"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </Select>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="max-w-[11rem]"
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          <option value="discussion">Discussion</option>
          <option value="manifesto">Manifesto</option>
        </Select>
        <span className="text-xs text-zinc-500">
          {filtered.length} of {posts.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No posts match your filters.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {filtered.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {p.authorName}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">{p.authorMatric}</span>
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
              <ModeratePostButtons postId={p.id} status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
