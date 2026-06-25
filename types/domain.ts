export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

export const ACTION_ERRORS = {
  unauthenticated: { code: 'unauthenticated', message: 'You must be logged in.' },
  forbidden: { code: 'forbidden', message: 'You do not have permission for that.' },
  invalid_input: { code: 'invalid_input', message: 'Please check the form and try again.' },
  already_voted: { code: 'already_voted', message: 'You have already voted for this position.' },
  election_not_live: { code: 'election_not_live', message: 'Voting is not open right now.' },
  candidate_not_approved: { code: 'candidate_not_approved', message: 'Candidate is not approved.' },
  throttled: { code: 'throttled', message: 'Too many attempts. Try again in 15 minutes.' },
  invalid_credentials: { code: 'invalid_credentials', message: 'Invalid credentials.' },
  account_suspended: {
    code: 'account_suspended',
    message: 'Your account has been suspended. Contact the electoral committee.',
  },
  unknown: { code: 'unknown', message: 'Something went wrong. Please try again.' },
} as const

export type ActionErrorCode = keyof typeof ACTION_ERRORS

export function err(code: ActionErrorCode, override?: string): ActionResult<never> {
  return {
    ok: false,
    error: { code, message: override ?? ACTION_ERRORS[code].message },
  }
}

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}
