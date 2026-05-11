import { type ReactNode } from 'react'
import { requireProfile } from '@/lib/auth/guards'
import { MainNav } from '@/components/nav/main-nav'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile()
  return (
    <div className="flex min-h-full flex-col">
      <MainNav profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
