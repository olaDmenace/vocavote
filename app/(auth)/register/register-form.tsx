'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'

import { register as registerAction, login } from '@/app/actions/auth'
import { registerSchema, type RegisterInput } from '@/lib/validation/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Field, FieldError, FieldHint } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'

const LEVELS = ['100', '200', '300', '400', '500', '600'] as const

export function RegisterForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      matricNo: '',
      fullName: '',
      department: '',
      faculty: '',
      level: '100',
      password: '',
    },
  })

  function onSubmit(values: RegisterInput) {
    setFormError(null)
    startTransition(async () => {
      const result = await registerAction(values)
      if (!result.ok) {
        setFormError(result.error.message)
        return
      }
      // Sign in immediately so the session cookie is set, then bounce to /feed.
      const signedIn = await login({ matricNo: values.matricNo, password: values.password })
      if (!signedIn.ok) {
        router.replace(`/login?next=/feed`)
        return
      }
      router.replace(signedIn.data.next)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Field>
        <Label htmlFor="matricNo">Matric number</Label>
        <Input
          id="matricNo"
          autoComplete="username"
          placeholder="CSC/2019/115"
          aria-invalid={Boolean(errors.matricNo) || undefined}
          {...register('matricNo')}
        />
        <FieldHint>Format: three letters / four-digit year / three digits.</FieldHint>
        <FieldError message={errors.matricNo?.message} />
      </Field>

      <Field>
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          autoComplete="name"
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password) || undefined}
          {...register('password')}
        />
        <FieldHint>At least 8 characters.</FieldHint>
        <FieldError message={errors.password?.message} />
      </Field>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
