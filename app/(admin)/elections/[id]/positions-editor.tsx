'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPosition } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'

type Position = {
  id: number
  title: string
  description: string | null
  display_order: number
}

export function PositionsEditor({
  electionId,
  positions,
}: {
  electionId: number
  positions: Position[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createPosition({
        electionId,
        title: title.trim(),
        description: description.trim() || undefined,
        displayOrder: positions.length,
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setTitle('')
      setDescription('')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {positions.length > 0 ? (
        <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {positions.map((p, idx) => (
            <li key={p.id} className="py-2 text-sm">
              <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-zinc-100 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {idx + 1}
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{p.title}</span>
              {p.description ? (
                <span className="ml-2 text-zinc-500">{p.description}</span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-zinc-500">No positions yet.</p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="position-title">New position title</Label>
            <Input
              id="position-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="President"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="position-desc">Description (optional)</Label>
            <Input
              id="position-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Head of the SUG executive council"
            />
          </div>
        </div>
        <Textarea hidden value="" readOnly aria-hidden="true" className="hidden" />
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || !title.trim()}>
            {isPending ? 'Adding…' : 'Add position'}
          </Button>
        </div>
      </form>
    </div>
  )
}
