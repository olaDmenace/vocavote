import { type ReactNode } from 'react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            VocaVote
          </Link>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            OAU SUG Electoral Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
