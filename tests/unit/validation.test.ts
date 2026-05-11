import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from '@/lib/validation/auth'
import { castVoteSchema } from '@/lib/validation/votes'
import { createPostSchema } from '@/lib/validation/posts'
import { updateProfileSchema } from '@/lib/validation/profile'

describe('loginSchema', () => {
  it('accepts a valid login payload', () => {
    const r = loginSchema.safeParse({ matricNo: 'CSC/2019/115', password: 'p4ssword' })
    expect(r.success).toBe(true)
  })

  it('uppercases matric via the schema transform', () => {
    const r = loginSchema.parse({ matricNo: 'csc/2019/115', password: 'p4ssword' })
    expect(r.matricNo).toBe('CSC/2019/115')
  })

  it('rejects an empty password', () => {
    const r = loginSchema.safeParse({ matricNo: 'CSC/2019/115', password: '' })
    expect(r.success).toBe(false)
  })
})

describe('registerSchema', () => {
  const base = {
    matricNo: 'CSC/2019/115',
    fullName: 'Adekola Olalekan',
    department: 'Computer Science and Engineering',
    faculty: 'Technology',
    level: '500' as const,
    password: 'super-secret-pw',
  }

  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse(base).success).toBe(true)
  })

  it('rejects level outside the allowed set', () => {
    expect(registerSchema.safeParse({ ...base, level: '700' as unknown as '100' }).success).toBe(
      false,
    )
  })

  it('rejects short passwords', () => {
    expect(registerSchema.safeParse({ ...base, password: 'short' }).success).toBe(false)
  })
})

describe('castVoteSchema', () => {
  it('coerces string ids to numbers', () => {
    const r = castVoteSchema.parse({ positionId: '12', candidateId: '34' })
    expect(r).toEqual({ positionId: 12, candidateId: 34 })
  })

  it('rejects non-positive ids', () => {
    expect(castVoteSchema.safeParse({ positionId: 0, candidateId: 1 }).success).toBe(false)
    expect(castVoteSchema.safeParse({ positionId: -1, candidateId: 1 }).success).toBe(false)
  })
})

describe('createPostSchema', () => {
  it('requires a non-empty body', () => {
    expect(createPostSchema.safeParse({ type: 'discussion', body: '' }).success).toBe(false)
  })

  it('allows discussion posts without candidate_id', () => {
    expect(
      createPostSchema.safeParse({ type: 'discussion', body: 'Hi everyone.' }).success,
    ).toBe(true)
  })
})

describe('updateProfileSchema', () => {
  it('caps bio at 280 chars', () => {
    const long = 'x'.repeat(281)
    const r = updateProfileSchema.safeParse({
      fullName: 'X',
      department: 'D',
      faculty: 'F',
      level: '300',
      bio: long,
    })
    expect(r.success).toBe(false)
  })
})
