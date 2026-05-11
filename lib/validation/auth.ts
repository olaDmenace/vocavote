import { z } from 'zod'
import { MATRIC_REGEX } from '@/lib/auth/matric-to-email'

const LEVELS = ['100', '200', '300', '400', '500', '600'] as const

export const matricSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(MATRIC_REGEX, 'Use the format XXX/YYYY/NNN (e.g. CSC/2019/115).')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password is too long.')

export const registerSchema = z.object({
  matricNo: matricSchema,
  fullName: z.string().trim().min(2, 'Enter your full name.').max(150),
  department: z.string().trim().min(2, 'Enter your department.').max(100),
  faculty: z.string().trim().min(2, 'Enter your faculty.').max(100),
  level: z.enum(LEVELS),
  password: passwordSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  matricNo: matricSchema,
  password: z.string().min(1, 'Enter your password.'),
})

export type LoginInput = z.infer<typeof loginSchema>
