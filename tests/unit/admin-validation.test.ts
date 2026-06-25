import { describe, expect, it } from 'vitest'
import {
  moderateCommentSchema,
  setUserRoleSchema,
  setUserActiveSchema,
} from '@/lib/validation/admin'
import { isSelfTargeted } from '@/lib/auth/is-self-targeted'

const UUID = '760f957c-1ded-4299-b941-35ada6b69af7'

describe('moderateCommentSchema', () => {
  it('accepts a valid hide', () => {
    const r = moderateCommentSchema.safeParse({ commentId: 5, status: 'hidden' })
    expect(r.success).toBe(true)
  })
  it('rejects a bad status', () => {
    const r = moderateCommentSchema.safeParse({ commentId: 5, status: 'nuked' })
    expect(r.success).toBe(false)
  })
  it('rejects a non-positive id', () => {
    const r = moderateCommentSchema.safeParse({ commentId: 0, status: 'active' })
    expect(r.success).toBe(false)
  })
})

describe('setUserRoleSchema', () => {
  it('accepts admin role with a uuid', () => {
    const r = setUserRoleSchema.safeParse({ userId: UUID, role: 'admin' })
    expect(r.success).toBe(true)
  })
  it('rejects a non-uuid userId', () => {
    const r = setUserRoleSchema.safeParse({ userId: 'nope', role: 'admin' })
    expect(r.success).toBe(false)
  })
  it('rejects an unknown role', () => {
    const r = setUserRoleSchema.safeParse({ userId: UUID, role: 'superuser' })
    expect(r.success).toBe(false)
  })
})

describe('setUserActiveSchema', () => {
  it('accepts a boolean isActive', () => {
    const r = setUserActiveSchema.safeParse({ userId: UUID, isActive: false })
    expect(r.success).toBe(true)
  })
  it('rejects a non-boolean isActive', () => {
    const r = setUserActiveSchema.safeParse({ userId: UUID, isActive: 'yes' })
    expect(r.success).toBe(false)
  })
})

describe('isSelfTargeted', () => {
  it('is true when actor equals target', () => {
    expect(isSelfTargeted(UUID, UUID)).toBe(true)
  })
  it('is false for different ids', () => {
    expect(isSelfTargeted(UUID, 'other')).toBe(false)
  })
})
