import { type ReactNode } from 'react'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { MainNav } from '@/components/nav/main-nav'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdmin()

  return (
    <div className="flex min-h-full flex-col">
      <MainNav profile={profile} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="flex flex-col gap-1 text-sm">
            <AdminLink href="/dashboard">Dashboard</AdminLink>
            <AdminLink href="/elections">Elections</AdminLink>
            <AdminLink href="/moderation">Moderation</AdminLink>
            <AdminLink href="/users">Users</AdminLink>
            <AdminLink href="/activity">Activity</AdminLink>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function AdminLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {children}
    </Link>
  )
}
