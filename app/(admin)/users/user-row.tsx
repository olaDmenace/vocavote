'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setUserRole, setUserActive, resetUserPassword } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

export type UserRowData = {
  id: string
  fullName: string
  matricNo: string
  department: string
  role: 'student' | 'admin'
  isActive: boolean
  isSelf: boolean
}

export function UserRow({ user }: { user: UserRowData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  function run(fn: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        setError(result.error?.message ?? 'Something went wrong.')
        return
      }
      router.refresh()
    })
  }

  function onResetPassword() {
    if (!confirm(`Reset ${user.fullName}'s password to a new temporary one?`)) return
    setError(null)
    setTempPassword(null)
    startTransition(async () => {
      const result = await resetUserPassword({ userId: user.id })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setTempPassword(result.data.tempPassword)
    })
  }

  return (
    <tr className="align-middle">
      <td className="py-2 pr-4">
        <div className="font-medium text-zinc-900 dark:text-zinc-50">{user.fullName}</div>
        <div className="text-xs text-zinc-500">{user.matricNo}</div>
      </td>
      <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{user.department}</td>
      <td className="py-2 pr-4">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {user.role}
        </span>
      </td>
      <td className="py-2 pr-4">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            user.isActive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
          }`}
        >
          {user.isActive ? 'active' : 'suspended'}
        </span>
      </td>
      <td className="py-2">
        {user.isSelf ? (
          <span className="text-xs text-zinc-400">You</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {error ? <span className="text-xs text-red-600">{error}</span> : null}
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  setUserRole({ userId: user.id, role: user.role === 'admin' ? 'student' : 'admin' }),
                )
              }
            >
              {user.role === 'admin' ? 'Demote' : 'Promote'}
            </Button>
            <Button
              size="sm"
              variant={user.isActive ? 'destructive' : 'outline'}
              disabled={isPending}
              onClick={() => run(() => setUserActive({ userId: user.id, isActive: !user.isActive }))}
            >
              {user.isActive ? 'Suspend' : 'Reactivate'}
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={onResetPassword}>
              Reset password
            </Button>
            {tempPassword ? (
              <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Temp password:{' '}
                <code className="font-mono font-semibold">{tempPassword}</code>
                <button
                  type="button"
                  className="ml-1 underline"
                  onClick={() => navigator.clipboard?.writeText(tempPassword)}
                >
                  copy
                </button>
              </span>
            ) : null}
          </div>
        )}
      </td>
    </tr>
  )
}
