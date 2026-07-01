import { z } from 'zod'

const futureIso = z.string().datetime({ offset: true })

export const createElectionSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(2000).optional(),
    startAt: futureIso,
    endAt: futureIso,
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: 'End time must be after start time.',
    path: ['endAt'],
  })

export type CreateElectionInput = z.infer<typeof createElectionSchema>

export const setElectionStatusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(['draft', 'live', 'closed']),
})

export const createPositionSchema = z.object({
  electionId: z.coerce.number().int().positive(),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
})

export const createCandidateSchema = z.object({
  studentId: z.string().uuid(),
  positionId: z.coerce.number().int().positive(),
})

export const moderatePostSchema = z.object({
  postId: z.coerce.number().int().positive(),
  status: z.enum(['active', 'hidden', 'deleted']),
})

export const moderateCommentSchema = z.object({
  commentId: z.coerce.number().int().positive(),
  status: z.enum(['active', 'hidden', 'deleted']),
})

export const setUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['student', 'admin']),
})

export const setUserActiveSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
})

export const resetUserPasswordSchema = z.object({
  userId: z.string().uuid(),
})
