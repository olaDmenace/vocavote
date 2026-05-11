export const MATRIC_REGEX = /^[A-Z]{3}\/\d{4}\/\d{3}$/

const SYNTHETIC_EMAIL_DOMAIN = 'student.oauife.edu.ng'

export function isValidMatric(matric: string): boolean {
  return MATRIC_REGEX.test(matric)
}

/**
 * Map a matric number to the synthetic email used for Supabase Auth.
 * CSC/2019/115 → csc-2019-115@student.oauife.edu.ng
 *
 * v1 chapter constraint: students log in by matric, not real email.
 * Reversal is intentional — see PRD §5.1 FR-1.2.
 */
export function matricToEmail(matric: string): string {
  const normalized = matric.trim().toUpperCase()
  if (!isValidMatric(normalized)) {
    throw new Error(`Invalid matric format: ${matric}`)
  }
  const local = normalized.toLowerCase().replaceAll('/', '-')
  return `${local}@${SYNTHETIC_EMAIL_DOMAIN}`
}
