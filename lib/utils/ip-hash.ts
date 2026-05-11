import 'server-only'
import { createHash } from 'node:crypto'

/**
 * sha256(ip + salt) — 64-char hex. Stored on votes and login_attempts so
 * we can correlate abuse without retaining raw IP addresses.
 */
export function hashIp(ip: string | null | undefined): string {
  const salt = process.env.IP_HASH_SALT ?? 'unsalted-dev'
  const input = `${ip ?? 'unknown'}:${salt}`
  return createHash('sha256').update(input).digest('hex')
}

export function extractClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null
  return headers.get('x-real-ip')
}
