'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

export type NavItem = { href: string; label: string }

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DesktopNav({
  items,
  adminItem,
}: {
  items: NavItem[]
  adminItem?: NavItem
}) {
  const pathname = usePathname()

  return (
    <nav className="hidden items-center gap-4 text-sm md:flex">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'transition-colors',
              active
                ? 'font-medium text-zinc-900 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50',
            )}
          >
            {item.label}
          </Link>
        )
      })}
      {adminItem ? (
        <Link
          href={adminItem.href}
          aria-current={isActivePath(pathname, adminItem.href) ? 'page' : undefined}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            isActivePath(pathname, adminItem.href)
              ? 'bg-zinc-900 text-white ring-2 ring-zinc-900 ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:ring-zinc-50 dark:ring-offset-zinc-950'
              : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200',
          )}
        >
          {adminItem.label}
        </Link>
      ) : null}
    </nav>
  )
}
