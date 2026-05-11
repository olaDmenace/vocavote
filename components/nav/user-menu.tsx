'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/lib/auth/guards'
import { ChevronDown } from 'lucide-react'

export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
          {profile.full_name?.[0]?.toUpperCase() ?? '?'}
        </span>
        <span className="hidden sm:inline">{profile.full_name}</span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="border-b border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <div className="truncate font-medium text-zinc-800 dark:text-zinc-200">
              {profile.matric_no}
            </div>
            <div className="truncate">{profile.department}</div>
          </div>
          <Link
            role="menuitem"
            href={`/profile/${profile.id}`}
            className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            My profile
          </Link>
          <Link
            role="menuitem"
            href="/profile/edit"
            className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Edit profile
          </Link>
          <form action={logout} className="border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-none"
            >
              Sign out
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
