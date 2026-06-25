import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserRow, type UserRowData } from './user-row'

export default async function UsersPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, matric_no, department, role, is_active')
    .order('full_name')

  const rows: UserRowData[] = (profiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    matricNo: p.matric_no,
    department: p.department,
    role: p.role as 'student' | 'admin',
    isActive: p.is_active,
    isSelf: p.id === admin.id,
  }))

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Users
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Promote or demote admins and suspend accounts. You cannot change your own.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <CardDescription>{rows.length} total</CardDescription>
        </CardHeader>
        <CardContent>
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
                {rows.map((u) => (
                  <UserRow key={u.id} user={u} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
