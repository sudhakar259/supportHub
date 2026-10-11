import { describe, expect, it } from 'vitest'

import { describeResetError } from '@/features/auth/resetErrors'
import { ApiError } from '@/types/api'

describe('describeResetError', () => {
  it('explains an expired or already-used link, instead of the server\'s generic "Validation failed."', () => {
    const result = describeResetError(new ApiError('Validation failed.', 422, { email: ['This password reset token is invalid or has expired.'] }))

    expect(result.needsNewLink).toBe(true)
    expect(result.message).toMatch(/expired or has already been used/i)
    expect(result.message).toMatch(/60 minutes/)
    expect(result.message).not.toMatch(/Validation failed/)
  })

  it('shows the password rule that was broken, and does not ask for a new link', () => {
    const result = describeResetError(new ApiError('Validation failed.', 422, { password: ['The password field must contain at least one symbol.'] }))

    expect(result).toEqual({ message: 'The password field must contain at least one symbol.', needsNewLink: false })
  })

  it('tells the person to wait when they are rate limited', () => {
    const result = describeResetError(new ApiError('Too Many Attempts.', 429))

    expect(result.message).toMatch(/wait a minute/i)
    expect(result.needsNewLink).toBe(false)
  })

  it('reports a lost connection plainly', () => {
    expect(describeResetError(new TypeError('Failed to fetch')).message).toMatch(/could not reach the server/i)
  })

  it('falls back to the server\'s own message for anything else', () => {
    expect(describeResetError(new ApiError('This account has been deactivated.', 403)).message).toBe('This account has been deactivated.')
  })
})
