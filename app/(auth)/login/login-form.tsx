'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useTransition } from 'react'

import { login } from '@/app/actions/auth'
import { loginSchema, type LoginInput } from '@/lib/validation/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field, FieldError } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { matricNo: '', password: '' },
  })

  function onSubmit(values: LoginInput) {
    setFormError(null)
    startTransition(async () => {
      const result = await login(values)
      if (!result.ok) {
        setFormError(result.error.message)
        return
      }
      router.replace(next && next.startsWith('/') ? next : result.data.next)
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
        <FieldError message={errors.matricNo?.message} />
      </Field>

      <Field>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password) || undefined}
          {...register('password')}
        />
        <FieldError message={errors.password?.message} />
      </Field>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-center text-xs text-zinc-500">
        Forgot your password? Contact the electoral committee to have it reset.
      </p>
    </form>
  )
}
