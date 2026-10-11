import { ApiError } from '@/types/api'

export interface ResetErrorDescription {
  message: string
  /** True when asking for a fresh link is the only way forward (the link is spent, expired or unreadable). */
  needsNewLink: boolean
}

/**
 * Turns a failed "set new password" request into something a person can act on. The server answers every
 * rejection with the generic "Validation failed." and puts the real reason in a field ("email" holds the
 * invalid-or-expired-link reason), so showing the top-level message alone told people nothing.
 */
export function describeResetError(error: unknown): ResetErrorDescription {
  if (!(error instanceof ApiError)) {
    return { message: 'We could not reach the server. Check your connection and try again.', needsNewLink: false }
  }

  if (error.status === 429) {
    return { message: 'Too many attempts. Please wait a minute and try again.', needsNewLink: false }
  }

  const linkProblem = error.fieldError('email') ?? error.fieldError('token')
  if (linkProblem && /token|link|expired/i.test(linkProblem)) {
    return {
      message: 'This password reset link has expired or has already been used. A link works once and lasts 60 minutes. Request a new one to continue.',
      needsNewLink: true,
    }
  }

  return {
    message: error.fieldError('password') ?? linkProblem ?? error.fieldError('tenant') ?? error.message,
    needsNewLink: false,
  }
}
