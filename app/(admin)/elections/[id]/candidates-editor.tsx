'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveCandidate, nominateCandidate, revokeCandidate } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'

type Position = { id: number; title: string }
type Student = { id: string; full_name: string; matric_no: string }
type Candidate = {
  id: number
  student_id: string
  position_id: number
  approved_at: string | null
  profiles: { full_name: string; matric_no: string } | null
}

export function CandidatesEditor({
  positions,
  candidates,
  students,
}: {
  positions: Position[]
  candidates: Candidate[]
  students: Student[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [positionId, setPositionId] = useState<number | ''>(positions[0]?.id ?? '')
  const [studentId, setStudentId] = useState<string>('')

  function onAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!positionId || !studentId) return
    setError(null)
    setSuccess(null)
    const studentLabel = students.find((s) => s.id === studentId)?.full_name ?? 'Candidate'
    startTransition(async () => {
      const result = await nominateCandidate({
        positionId: Number(positionId),
        studentId,
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setStudentId('')
      setSuccess(`${studentLabel} nominated. Approve them below to add them to the ballot.`)
      router.refresh()
    })
  }

  function onApprove(id: number) {
    setError(null)
    startTransition(async () => {
      const result = await approveCandidate({ candidateId: id })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  function onRevoke(id: number) {
    if (!confirm('Revoke approval for this candidate?')) return
    setError(null)
    startTransition(async () => {
      const result = await revokeCandidate({ candidateId: id })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  if (positions.length === 0) {
    return <p className="text-sm text-zinc-500">Add positions before nominating candidates.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {positions.map((p) => {
        const positionCandidates = candidates.filter((c) => c.position_id === p.id)
        return (
          <div
            key={p.id}
            className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{p.title}</div>
            {positionCandidates.length > 0 ? (
              <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                {positionCandidates.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {c.profiles?.full_name ?? '(unknown)'}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500">
                        {c.profiles?.matric_no}
                      </span>
                      {c.approved_at ? (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                          approved
                        </span>
                      ) : (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                          pending
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {c.approved_at ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRevoke(c.id)}
                          disabled={isPending}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => onApprove(c.id)} disabled={isPending}>
                          Approve
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">No candidates yet.</p>
            )}
          </div>
        )
      })}

      <form
        onSubmit={onAdd}
        className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        {success ? <Alert tone="success">{success}</Alert> : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="candidate-position">Position</Label>
            <Select
              id="candidate-position"
              value={positionId}
              onChange={(e) => setPositionId(e.target.value ? Number(e.target.value) : '')}
            >
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="candidate-student">Student</Label>
            <Select
              id="candidate-student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">Pick a student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.matric_no} — {s.full_name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || !studentId || !positionId}>
            {isPending ? 'Adding…' : 'Nominate candidate'}
          </Button>
        </div>
      </form>
    </div>
  )
}
