import { z } from 'zod'

export const castVoteSchema = z.object({
  positionId: z.coerce.number().int().positive(),
  candidateId: z.coerce.number().int().positive(),
})

export type CastVoteInput = z.infer<typeof castVoteSchema>
