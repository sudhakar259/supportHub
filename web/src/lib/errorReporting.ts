import type * as SentryModule from '@sentry/react'

/**
 * Error reporting for the browser. Everything goes through here so the rest of the app never imports Sentry.
 *
 * - Without VITE_SENTRY_DSN it does nothing (errors still reach the browser console), and the Sentry code is never
 *   downloaded: it is loaded on demand by initErrorReporting().
 * - What is sent is deliberately thin: where it broke and a short reference, never who the person is. No user
 *   identity, no cookies, no URL query strings (reset links carry tokens and emails), no console output.
 *
 * Setup and what to expect: docs/error-tracking.md.
 */

type Sentry = typeof SentryModule

let sentry: Sentry | null = null

/** Shown to the person on an error screen so they can quote it, and attached to the report so support can find it. */
export function newReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Keeps the address of the page and drops `?query` and `#hash`, which can hold tokens and email addresses. */
export function scrubUrl(url: string): string {
  return url.split(/[?#]/)[0]
}

/** Emails, bearer tokens and API keys inside free text (an error message can quote what the user typed). */
export function redact(text: string): string {
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\bBearer\s+[A-Za-z0-9._-]{16,}/gi, 'Bearer [token]')
    .replace(/\b(?:ak|as|whsec|rzp_live|rzp_test)_[A-Za-z0-9]{10,}\b/g, '[secret]')
    .replace(/([?&](?:token|signature|code|password)=)[^&\s"']+/gi, '$1[redacted]')
}

/**
 * Failures that are part of normal use and already shown to the person (a wrong password, a validation message,
 * a lost connection) are not bugs; reporting them would bury the real ones.
 */
export function isExpectedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.name === 'AbortError') return true
  if (error.name === 'ApiError') {
    const status = (error as Error & { status?: number }).status
    return typeof status === 'number' && status >= 400 && status < 500
  }
  return /ResizeObserver loop/.test(error.message)
}

/** An old tab asking for a file that a newer deploy replaced, or a connection that dropped mid-load. */
export function isStaleBundleError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically imported module/i.test(message)
}

/** Loads and starts Sentry when a DSN is configured. Safe to call once at start-up; failures never break the app. */
export async function initErrorReporting(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn || sentry) return

  try {
    const loaded = await import('@sentry/react')
    loaded.init({
      dsn,
      environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) || import.meta.env.MODE,
      release: import.meta.env.VITE_RELEASE as string | undefined,
      // This SDK version collects cookies, headers, request bodies, query strings and user details unless told
      // otherwise. Turn all of it off: a report says where something broke, not who was using it.
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
      tracesSampleRate: 0,
      maxBreadcrumbs: 20,
      denyUrls: [/^chrome-extension:\/\//i, /^moz-extension:\/\//i, /^safari-extension:\/\//i],
      beforeSend(event, hint) {
        if (isExpectedError(hint?.originalException)) return null

        if (event.request?.url) event.request.url = scrubUrl(event.request.url)
        if (event.request) {
          delete event.request.cookies
          delete event.request.query_string
          delete event.request.headers
        }
        delete event.user
        for (const value of event.exception?.values ?? []) {
          if (value.value) value.value = redact(value.value)
        }
        return event
      },
      beforeBreadcrumb(crumb) {
        if (crumb.category === 'console') return null
        if (crumb.data) {
          for (const key of ['url', 'from', 'to'] as const) {
            if (typeof crumb.data[key] === 'string') crumb.data[key] = scrubUrl(crumb.data[key])
          }
        }
        return crumb
      },
    })
    sentry = loaded
  } catch (error) {
    // Monitoring must never be the reason the product does not load.
    console.warn('Error reporting could not start', error)
  }
}

/** Reports an error. Returns the short reference that was attached to it (pass your own to match one already shown). */
export function reportError(error: unknown, context: { source: string; reference?: string } = { source: 'app' }): string {
  const reference = context.reference ?? newReference()

  if (import.meta.env.DEV) console.error(`[${context.source}] ${reference}`, error)

  if (sentry && !isExpectedError(error)) {
    sentry.withScope((scope) => {
      scope.setTag('source', context.source)
      scope.setTag('reference', reference)
      sentry!.captureException(error instanceof Error ? error : new Error(String(error)))
    })
  }

  return reference
}
