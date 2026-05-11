'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createElection } from '@/app/actions/admin'
import { createElectionSchema, type CreateElectionInput } from '@/lib/validation/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'

function isoLocalNow(offsetMs = 0): string {
  const d = new Date(Date.now() + offsetMs)
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}

export function ElectionCreator() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  // Compute initial window once on mount via useState's lazy initializer —
  // React purity rules disallow Date.now() during render or inside useMemo.
  const [initialDefaults] = useState<CreateElectionInput>(() => {
    const now = Date.now()
    return {
      title: '',
      description: '',
      startAt: new Date(now + 60 * 1000).toISOString(),
      endAt: new Date(now + 7 * 24 * 3600 * 1000).toISOString(),
    }
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateElectionInput>({
    resolver: zodResolver(createElectionSchema),
    defaultValues: initialDefaults,
  })

  function onSubmit(values: CreateElectionInput) {
    setFormError(null)
    startTransition(async () => {
      const result = await createElection(values)
      if (!result.ok) {
        setFormError(result.error.message)
        return
      }
      reset()
      router.push(`/elections/${result.data.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Field>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} aria-invalid={Boolean(errors.title) || undefined} />
        <FieldError message={errors.title?.message} />
      </Field>

      <Field>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} />
        <FieldError message={errors.description?.message} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="startAt">Start</Label>
          <Input
            id="startAt"
            type="datetime-local"
            defaultValue={isoLocalNow(60 * 1000)}
            {...register('startAt', { setValueAs: (v) => (v ? new Date(v).toISOString() : v) })}
            aria-invalid={Boolean(errors.startAt) || undefined}
          />
          <FieldError message={errors.startAt?.message} />
        </Field>

        <Field>
          <Label htmlFor="endAt">End</Label>
          <Input
            id="endAt"
            type="datetime-local"
            defaultValue={isoLocalNow(7 * 24 * 3600 * 1000)}
            {...register('endAt', { setValueAs: (v) => (v ? new Date(v).toISOString() : v) })}
            aria-invalid={Boolean(errors.endAt) || undefined}
          />
          <FieldError message={errors.endAt?.message} />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create election'}
        </Button>
      </div>
    </form>
  )
}
