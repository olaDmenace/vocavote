'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatRelative } from '@/lib/utils/format'

export type ActivityRow = {
  id: number
  action: string
  targetType: string | null
  targetId: number | null
  createdAt: string
  actorName: string
  actorMatric: string | null
}

export function ActivityLog({ rows }: { rows: ActivityRow[] }) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action.split('.')[0]))).sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (category !== 'all' && r.action.split('.')[0] !== category) return false
      if (
        s &&
        !`${r.action} ${r.actorName} ${r.actorMatric ?? ''} ${r.targetType ?? ''}`
          .toLowerCase()
          .includes(s)
      )
        return false
      return true
    })
  }, [rows, q, category])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search action or actor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="max-w-[12rem]"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <span className="text-xs text-zinc-500">
          {filtered.length} of {rows.length}
        </span>
      </div>

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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-sm text-zinc-500">
                  No activity matches your filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                    {formatRelative(row.createdAt)}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {row.actorName}
                    </span>
                    {row.actorMatric ? (
                      <span className="ml-1 text-xs text-zinc-500">({row.actorMatric})</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4">
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {row.action}
                    </code>
                  </td>
                  <td className="py-2 text-xs text-zinc-500">
                    {row.targetType ? `${row.targetType}#${row.targetId}` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
