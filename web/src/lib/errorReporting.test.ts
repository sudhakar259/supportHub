import { describe, expect, it, vi } from 'vitest'

import { initErrorReporting, isExpectedError, isStaleBundleError, newReference, redact, reportError, scrubUrl } from '@/lib/errorReporting'
import { ApiError } from '@/types/api'

describe('error reporting privacy rules', () => {
  it('keeps the page address but drops the query string and fragment, where reset tokens and emails live', () => {
    expect(scrubUrl('https://acme.example.com/reset-password?token=abc123&email=jamie@example.com#top')).toBe('https://acme.example.com/reset-password')
    expect(scrubUrl('https://example.com/tickets/42')).toBe('https://example.com/tickets/42')
  })

  it('redacts emails, tokens and keys that an error message might quote', () => {
    const text = redact('Failed for jamie@example.com with Bearer abcdefghijklmnop1234 and key ak_abcdef1234567890, see ?token=abc123&x=1')

    expect(text).toContain('[email]')
    expect(text).toContain('Bearer [token]')
    expect(text).toContain('[secret]')
    expect(text).toContain('token=[redacted]')
    expect(text).not.toMatch(/jamie@example\.com|abcdefghijklmnop1234|ak_abcdef|abc123/)
  })

  it('leaves ordinary text alone', () => {
    expect(redact('Cannot read properties of undefined (reading "name")')).toBe('Cannot read properties of undefined (reading "name")')
  })
})

describe('which errors count as bugs', () => {
  it('ignores failures the person already saw (wrong password, validation, not found) but not server faults', () => {
    expect(isExpectedError(new ApiError('Validation failed.', 422))).toBe(true)
    expect(isExpectedError(new ApiError('Unauthenticated.', 401))).toBe(true)
    expect(isExpectedError(new ApiError('Not found.', 404))).toBe(true)
    expect(isExpectedError(new ApiError('Server error', 500))).toBe(false)
    expect(isExpectedError(new ApiError('Bad gateway', 502))).toBe(false)
  })

  it('ignores aborted requests and the harmless ResizeObserver notice, but not real exceptions', () => {
    const abort = new Error('aborted')
    abort.name = 'AbortError'
    expect(isExpectedError(abort)).toBe(true)
    expect(isExpectedError(new Error('ResizeObserver loop completed with undelivered notifications.'))).toBe(true)
    expect(isExpectedError(new TypeError("Cannot read properties of undefined (reading 'name')"))).toBe(false)
    expect(isExpectedError('a string')).toBe(false)
  })

  it('recognises a stale page after a deploy or a dropped connection', () => {
    expect(isStaleBundleError(new Error('Failed to fetch dynamically imported module: https://x/assets/Page-abc.js'))).toBe(true)
    expect(isStaleBundleError(new Error('error loading dynamically imported module'))).toBe(true)
    expect(isStaleBundleError(new Error('Importing a module script failed.'))).toBe(true)
    expect(isStaleBundleError(new Error('Cannot read properties of undefined'))).toBe(false)
  })
})

describe('reportError', () => {
  it('returns a short reference and never throws when reporting is not configured', () => {
    const reference = reportError(new Error('boom'), { source: 'test' })

    expect(reference).toMatch(/^[0-9a-f]{8}$/)
  })

  it('uses the reference it is given, so the one on screen matches the one reported', () => {
    expect(reportError(new Error('boom'), { source: 'test', reference: 'abcd1234' })).toBe('abcd1234')
  })

  it('makes a different reference each time', () => {
    expect(new Set(Array.from({ length: 20 }, newReference)).size).toBeGreaterThan(15)
  })

  it('does nothing, and loads nothing, when no key is configured', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(initErrorReporting()).resolves.toBeUndefined()

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
