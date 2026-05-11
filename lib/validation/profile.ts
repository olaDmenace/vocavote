import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  department: z.string().trim().min(2).max(100),
  faculty: z.string().trim().min(2).max(100),
  level: z.enum(['100', '200', '300', '400', '500', '600']),
  bio: z.string().trim().max(280, 'Bio must be 280 characters or fewer.').optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // 2 MB
export const AVATAR_MIME_WHITELIST = ['image/jpeg', 'image/png'] as const
