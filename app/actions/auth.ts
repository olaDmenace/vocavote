'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { matricToEmail } from '@/lib/auth/matric-to-email'
import { extractClientIp, hashIp } from '@/lib/utils/ip-hash'
import { loginSchema, registerSchema } from '@/lib/validation/auth'
import { ok, err, type ActionResult } from '@/types/domain'

export async function register(input: z.input<typeof registerSchema>): Promise<ActionResult<{ userId: string }>> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return err('invalid_input', parsed.error.issues[0]?.message ?? 'Check your inputs.')
  }
  const data = parsed.data
  const email = matricToEmail(data.matricNo)

  const supabase = await createClient()
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password: data.password,
    options: {
      data: {
        matric_no: data.matricNo,
        full_name: data.fullName,
        department: data.department,
        faculty: data.faculty,
        level: data.level,
      },
    },
  })

  if (error) {
    if (error.message?.toLowerCase().includes('already')) {
      return err('invalid_input', 'A user with that matric number already exists.')
    }
    return err('unknown', error.message)
  }
  if (!signUpData.user) return err('unknown', 'Sign up did not return a user.')

  return ok({ userId: signUpData.user.id })
}

export async function login(input: z.input<typeof loginSchema>): Promise<ActionResult<{ next: string }>> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return err('invalid_input', parsed.error.issues[0]?.message ?? 'Check your inputs.')
  }
  const { matricNo, password } = parsed.data

  const supabase = await createClient()
  const h = await headers()
  const ipHash = hashIp(extractClientIp(h))

  // FR-1.6 throttle: 5 failed attempts / 15 min per matric.
  const { data: locked, error: throttleError } = await supabase.rpc('check_throttle', {
    p_matric_no: matricNo,
  })
  if (throttleError) return err('unknown', throttleError.message)
  if (locked === true) return err('throttled')

  const email = matricToEmail(matricNo)
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  await supabase.rpc('record_login_attempt', {
    p_matric_no: matricNo,
    p_ip_hash: ipHash,
    p_success: !error,
  })

  if (error) {
    return err('invalid_credentials')
  }

  return ok({ next: '/feed' })
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
