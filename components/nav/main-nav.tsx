import Link from 'next/link'
import { Vote } from 'lucide-react'
import { UserMenu } from './user-menu'
import { MobileNav } from './mobile-nav'
import { DesktopNav } from './desktop-nav'
import type { Profile } from '@/lib/auth/guards'

export function MainNav({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === 'admin'
  const navItems = [
    { href: '/feed', label: 'Feed' },
    { href: '/candidates', label: 'Candidates' },
    { href: '/ballot', label: 'Ballot' },
  ]
  const adminItem = isAdmin ? { href: '/dashboard', label: 'Admin' } : undefined

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3 sm:gap-6">
          <MobileNav items={adminItem ? [...navItems, adminItem] : navItems} />
          <Link
            href="/feed"
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <Vote className="h-5 w-5" aria-hidden="true" />
            VocaVote
          </Link>
          <DesktopNav items={navItems} adminItem={adminItem} />
        </div>
        <UserMenu profile={profile} />
      </div>
    </header>
  )
}
