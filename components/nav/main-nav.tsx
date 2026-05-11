import Link from 'next/link'
import { Vote } from 'lucide-react'
import { UserMenu } from './user-menu'
import type { Profile } from '@/lib/auth/guards'

export function MainNav({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === 'admin'

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/feed"
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <Vote className="h-5 w-5" aria-hidden="true" />
            VocaVote
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400 md:flex">
            <Link href="/feed" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Feed
            </Link>
            <Link href="/candidates" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Candidates
            </Link>
            {isAdmin ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
        <UserMenu profile={profile} />
      </div>
    </header>
  )
}
