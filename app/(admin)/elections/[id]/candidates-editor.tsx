'use client'

import { useState, useTransition } from 'react'
import {
  approveCandidate,
  nominateCandidate,
  revokeCandidate,
  addPollOption,
  removePollOption,
} from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'

type Position = { id: number; title: string; kind: string }
type Student = { id: string; full_name: string; matric_no: string }
type Candidate = {
  id: number
  student_id: string | null
  position_id: number
  approved_at: string | null
  label: string | null
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
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string>('')
  const [optionInputs, setOptionInputs] = useState<Record<number, string>>({})
  const [list, setList] = useState<Candidate[]>(candidates)

  const candidatePositions = positions.filter((p) => p.kind !== 'poll')
  const [selectedPosition, setSelectedPosition] = useState<number | ''>('')
  const positionId: number | '' =
    selectedPosition !== '' ? selectedPosition : candidatePositions[0]?.id ?? ''

  function onNominate(e: React.FormEvent) {
    e.preventDefault()
    if (!positionId || !studentId) return
    setError(null)
    setSuccess(null)
    const student = students.find((s) => s.id === studentId)
    const pid = Number(positionId)
    const sid = studentId
    startTransition(async () => {
      const result = await nominateCandidate({ positionId: pid, studentId: sid })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setList((prev) => [
        ...prev,
        {
          id: result.data.id,
          student_id: sid,
          position_id: pid,
          approved_at: null,
          label: null,
          profiles: student
            ? { full_name: student.full_name, matric_no: student.matric_no }
            : null,
        },
      ])
      setStudentId('')
      setSuccess(`${student?.full_name ?? 'Candidate'} nominated. Approve them to add to the ballot.`)
    })
  }

  function onApprove(id: number) {
    setError(null)
    startTransition(async () => {
      const result = await approveCandidate({ candidateId: id })
      if (!result.ok) return setError(result.error.message)
      setList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, approved_at: new Date().toISOString() } : c)),
      )
    })
  }

  function onRevoke(id: number) {
    if (!confirm('Revoke approval for this candidate?')) return
    setError(null)
    startTransition(async () => {
      const result = await revokeCandidate({ candidateId: id })
      if (!result.ok) return setError(result.error.message)
      setList((prev) => prev.map((c) => (c.id === id ? { ...c, approved_at: null } : c)))
    })
  }

  function onAddOption(positionId: number) {
    const label = (optionInputs[positionId] ?? '').trim()
    if (!label) return
    setError(null)
    startTransition(async () => {
      const result = await addPollOption({ positionId, label })
      if (!result.ok) return setError(result.error.message)
      setList((prev) => [
        ...prev,
        {
          id: result.data.id,
          student_id: null,
          position_id: positionId,
          approved_at: new Date().toISOString(),
          label,
          profiles: null,
        },
      ])
      setOptionInputs((prev) => ({ ...prev, [positionId]: '' }))
    })
  }

  function onRemoveOption(id: number) {
    if (!confirm('Remove this option?')) return
    setError(null)
    startTransition(async () => {
      const result = await removePollOption({ candidateId: id })
      if (!result.ok) return setError(result.error.message)
      setList((prev) => prev.filter((c) => c.id !== id))
    })
  }

  if (positions.length === 0) {
    return <p className="text-sm text-zinc-500">Add positions before adding candidates or options.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      {positions.map((p) => {
        const choices = list.filter((c) => c.position_id === p.id)
        const isPoll = p.kind === 'poll'
        return (
          <div key={p.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {p.title}
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {isPoll ? 'poll' : 'candidates'}
              </span>
            </div>

            {choices.length > 0 ? (
              <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                {choices.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {isPoll ? c.label : (c.profiles?.full_name ?? '(unknown)')}
                      </span>
                      {!isPoll ? (
                        <span className="ml-2 text-xs text-zinc-500">{c.profiles?.matric_no}</span>
                      ) : null}
                      {!isPoll ? (
                        c.approved_at ? (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                            approved
                          </span>
                        ) : (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            pending
                          </span>
                        )
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      {isPoll ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveOption(c.id)}
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                      ) : c.approved_at ? (
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
              <p className="mt-1 text-xs text-zinc-500">
                {isPoll ? 'No options yet.' : 'No candidates yet.'}
              </p>
            )}

            {isPoll ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  onAddOption(p.id)
                }}
                className="mt-3 flex gap-2"
              >
                <Input
                  value={optionInputs[p.id] ?? ''}
                  onChange={(e) =>
                    setOptionInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  placeholder="Add an option (e.g. Hostel A)"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !(optionInputs[p.id] ?? '').trim()}
                >
                  Add option
                </Button>
              </form>
            ) : null}
          </div>
        )
      })}

      {candidatePositions.length > 0 ? (
        <form
          onSubmit={onNominate}
          className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="candidate-position">Position</Label>
              <Select
                id="candidate-position"
                value={positionId}
                onChange={(e) => setSelectedPosition(e.target.value ? Number(e.target.value) : '')}
              >
                {candidatePositions.map((p) => (
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
      ) : null}
    </div>
  )
}
