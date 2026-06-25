import { z } from 'zod'

const POST_BODY_MAX = 8000

export const createPostSchema = z.object({
  type: z.enum(['discussion', 'manifesto']),
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1, 'Say something.').max(POST_BODY_MAX),
  candidateId: z.coerce.number().int().positive().optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>

export const updateManifestoSchema = z.object({
  postId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(POST_BODY_MAX),
})

export type UpdateManifestoInput = z.infer<typeof updateManifestoSchema>

export const createCommentSchema = z.object({
  postId: z.coerce.number().int().positive(),
  body: z.string().trim().min(1, 'Say something.').max(1500),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>

// Inline images attached to posts (uploaded to the public `post-media` bucket).
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const POST_IMAGE_MIME_WHITELIST = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const
