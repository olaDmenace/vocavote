'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/actions/notifications'
import { renderNotification, type NotificationRow } from '@/lib/notifications/render'
import { formatRelative } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export function NotificationBell({
  userId,
  initialItems,
  initialUnread,
}: {
  userId: string
  initialItems: NotificationRow[]
  initialUnread: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationRow[]>(initialItems)
  const [unread, setUnread] = useState(initialUnread)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Live-append notifications as they arrive.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as NotificationRow
          setItems((prev) => (prev.some((i) => i.id === row.id) ? prev : [row, ...prev].slice(0, 20)))
          setUnread((u) => u + 1)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  function onOpenItem(item: NotificationRow) {
    setOpen(false)
    if (!item.read_at) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, read_at: new Date().toISOString() } : i)),
      )
      setUnread((u) => Math.max(0, u - 1))
      markNotificationRead({ id: item.id })
    }
  }

  function onMarkAll() {
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })))
    setUnread(0)
    markAllNotificationsRead().then(() => router.refresh())
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              Notifications
            </span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={onMarkAll}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">No notifications yet.</p>
            ) : (
              items.map((item) => {
                const { text, href } = renderNotification(item)
                return (
                  <Link
                    key={item.id}
                    href={href}
                    role="menuitem"
                    onClick={() => onOpenItem(item)}
                    className={cn(
                      'block px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800',
                      !item.read_at && 'bg-zinc-50 dark:bg-zinc-800/50',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          item.read_at ? 'bg-transparent' : 'bg-red-500',
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="text-zinc-800 dark:text-zinc-100">{text}</div>
                        <div className="text-xs text-zinc-500">{formatRelative(item.created_at)}</div>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-zinc-200 px-3 py-2 text-center text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            See all
          </Link>
        </div>
      ) : null}
    </div>
  )
}
