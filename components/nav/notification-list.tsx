'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/actions/notifications'
import { renderNotification, type NotificationRow } from '@/lib/notifications/render'
import { formatRelative } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'

export function NotificationList({ initialItems }: { initialItems: NotificationRow[] }) {
  const router = useRouter()
  const [items, setItems] = useState<NotificationRow[]>(initialItems)
  const hasUnread = items.some((i) => !i.read_at)

  function onOpen(item: NotificationRow) {
    if (!item.read_at) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, read_at: new Date().toISOString() } : i)),
      )
      markNotificationRead({ id: item.id })
    }
  }

  function onMarkAll() {
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })))
    markAllNotificationsRead().then(() => router.refresh())
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Notifications
        </h1>
        {hasUnread ? (
          <Button variant="outline" size="sm" onClick={onMarkAll}>
            Mark all read
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
          No notifications yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const { text, href } = renderNotification(item)
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  onClick={() => onOpen(item)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900',
                    !item.read_at && 'bg-zinc-50 dark:bg-zinc-900',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      item.read_at ? 'bg-transparent' : 'bg-red-500',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-800 dark:text-zinc-100">{text}</div>
                    <div className="text-xs text-zinc-500">{formatRelative(item.created_at)}</div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
