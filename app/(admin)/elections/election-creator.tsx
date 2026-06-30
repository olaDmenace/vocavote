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

// The app runs on West Africa Time (UTC+1, no DST). We interpret the
// datetime-local inputs as WAT explicitly rather than the browser's timezone,
// so an admin in any locale gets the Nigerian time they typed — and it no longer
// shifts back an hour after saving.
const WAT_OFFSET = '+01:00'

// `YYYY-MM-DDTHH:mm` string representing the WAT wall-clock `offsetMs` from now.
function watWallClock(offsetMs = 0): string {
  const watMs = Date.now() + offsetMs + 60 * 60 * 1000 // shift UTC → WAT clock
  return new Date(watMs).toISOString().slice(0, 16)
}

// Treat a datetime-local value (no timezone) as WAT and return a UTC ISO string.
// react-hook-form also feeds the already-ISO default value back through here, so
// pass through anything that already carries a timezone, and never throw.
function watInputToISO(local: string): string {
  if (!local) return local
  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(local)
  const candidate = hasTimezone
    ? local
    : `${local.length === 16 ? `${local}:00` : local}${WAT_OFFSET}`
  const d = new Date(candidate)
  return Number.isNaN(d.getTime()) ? local : d.toISOString()
}

export function ElectionCreator() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  // Compute the initial window once on mount via useState's lazy initializer —
  // React purity rules disallow Date.now() during render or inside useMemo.
  // Keep the WAT wall-clock strings (for the inputs) and their ISO equivalents
  // (the form's actual values) in sync so an untouched field still submits WAT.
  const [defaults] = useState(() => {
    const startLocal = watWallClock(60 * 1000)
    const endLocal = watWallClock(7 * 24 * 3600 * 1000)
    return {
      startLocal,
      endLocal,
      startAt: watInputToISO(startLocal),
      endAt: watInputToISO(endLocal),
    }
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateElectionInput>({
    resolver: zodResolver(createElectionSchema),
    defaultValues: {
      title: '',
      description: '',
      startAt: defaults.startAt,
      endAt: defaults.endAt,
    },
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
            defaultValue={defaults.startLocal}
            {...register('startAt', { setValueAs: watInputToISO })}
            aria-invalid={Boolean(errors.startAt) || undefined}
          />
          <FieldError message={errors.startAt?.message} />
        </Field>

        <Field>
          <Label htmlFor="endAt">End</Label>
          <Input
            id="endAt"
            type="datetime-local"
            defaultValue={defaults.endLocal}
            {...register('endAt', { setValueAs: watInputToISO })}
            aria-invalid={Boolean(errors.endAt) || undefined}
          />
          <FieldError message={errors.endAt?.message} />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-zinc-500">
        Times are in West Africa Time (WAT, GMT+1).
      </p>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create election'}
        </Button>
      </div>
    </form>
  )
}
