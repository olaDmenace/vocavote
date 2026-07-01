'use client'

import { useMemo, useState } from 'react'
import { UserRow, type UserRowData } from './user-row'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function UsersManager({ rows }: { rows: UserRowData[] }) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState<'all' | 'student' | 'admin'>('all')
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows.filter((u) => {
      if (role !== 'all' && u.role !== role) return false
      if (status === 'active' && !u.isActive) return false
      if (status === 'suspended' && u.isActive) return false
      if (
        s &&
        !`${u.fullName} ${u.matricNo} ${u.department}`.toLowerCase().includes(s)
      )
        return false
      return true
    })
  }, [rows, q, role, status])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name, matric, department…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="max-w-[10rem]"
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="student">Students</option>
          <option value="admin">Admins</option>
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="max-w-[11rem]"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
        <span className="text-xs text-zinc-500">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Department</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-zinc-500">
                  No users match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((u) => <UserRow key={u.id} user={u} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
