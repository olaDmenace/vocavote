import { describe, expect, it } from 'vitest'
import { isValidMatric, matricToEmail } from '@/lib/auth/matric-to-email'

describe('isValidMatric', () => {
  it('accepts the canonical format', () => {
    expect(isValidMatric('CSC/2019/115')).toBe(true)
    expect(isValidMatric('PHY/2020/001')).toBe(true)
  })

  it('rejects bad shapes', () => {
    expect(isValidMatric('csc/2019/115')).toBe(false) // lowercase
    expect(isValidMatric('CS/2019/115')).toBe(false) // 2-letter prefix
    expect(isValidMatric('CSCD/2019/115')).toBe(false) // 4-letter prefix
    expect(isValidMatric('CSC-2019-115')).toBe(false) // dashes
    expect(isValidMatric('CSC/19/115')).toBe(false) // 2-digit year
    expect(isValidMatric('CSC/2019/15')).toBe(false) // 2-digit serial
    expect(isValidMatric('CSC/2019/1150')).toBe(false) // 4-digit serial
    expect(isValidMatric('')).toBe(false)
  })
})

describe('matricToEmail', () => {
  it('lowercases and replaces slashes with dashes', () => {
    expect(matricToEmail('CSC/2019/115')).toBe('csc-2019-115@student.oauife.edu.ng')
  })

  it('uppercases input that comes in lowercase', () => {
    expect(matricToEmail('csc/2019/115')).toBe('csc-2019-115@student.oauife.edu.ng')
  })

  it('throws on invalid matric', () => {
    expect(() => matricToEmail('csc-2019-115')).toThrow()
    expect(() => matricToEmail('')).toThrow()
  })
})
