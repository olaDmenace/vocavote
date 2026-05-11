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
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldHint } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'
import type { Profile } from '@/lib/auth/guards'

const LEVELS = ['100', '200', '300', '400', '500', '600'] as const

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: profile.full_name,
      department: profile.department,
      faculty: profile.faculty,
      level: profile.level as UpdateProfileInput['level'],
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
        <Label>Matric number</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            aria-invalid={Boolean(errors.department) || undefined}
            {...register('department')}
          />
          <FieldError message={errors.department?.message} />
        </Field>

        <Field>
          <Label htmlFor="faculty">Faculty</Label>
          <Input
            id="faculty"
            aria-invalid={Boolean(errors.faculty) || undefined}
            {...register('faculty')}
          />
          <FieldError message={errors.faculty?.message} />
        </Field>
      </div>

      <Field>
        <Label htmlFor="level">Level</Label>
        <Select
          id="level"
          aria-invalid={Boolean(errors.level) || undefined}
          {...register('level')}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        <FieldError message={errors.level?.message} />
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
