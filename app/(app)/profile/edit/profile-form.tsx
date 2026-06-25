'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { updateProfile } from '@/app/actions/profile'
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validation/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldHint } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'
import type { Profile } from '@/lib/auth/guards'

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const idLabel = profile.role === 'admin' ? 'Admin number' : 'Matric number'

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: profile.full_name,
      bio: profile.bio ?? '',
    },
  })

  function onSubmit(values: UpdateProfileInput) {
    setMessage(null)
    startTransition(async () => {
      const result = await updateProfile(values)
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.error.message })
        return
      }
      setMessage({ tone: 'success', text: 'Profile updated.' })
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <Field>
        <Label>{idLabel}</Label>
        <Input value={profile.matric_no} readOnly disabled />
        <FieldHint>Permanent — change requires admin action.</FieldHint>
      </Field>

      <Field>
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          aria-invalid={Boolean(errors.fullName) || undefined}
          {...register('fullName')}
        />
        <FieldError message={errors.fullName?.message} />
      </Field>

      <Field>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          maxLength={280}
          aria-invalid={Boolean(errors.bio) || undefined}
          {...register('bio')}
        />
        <FieldHint>Up to 280 characters.</FieldHint>
        <FieldError message={errors.bio?.message} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
