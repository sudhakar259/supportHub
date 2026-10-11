const TOKEN_KEY = 'supporthub.token'

/** Thin wrapper around localStorage so the storage mechanism can change without touching callers. */
export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* storage unavailable (private browsing, etc.) — session simply won't persist across reloads */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* no-op */
    }
  },
}

const IMPERSONATOR_KEY = 'supporthub.impersonator'

export interface ImpersonatorSession {
  /** The administrator's own token, restored when they return to their account. */
  token: string
  name: string
}

/**
 * Remembers the administrator's own session while they are "logged in as"
 * another user. sessionStorage, not localStorage: closing the tab ends the
 * impersonation, and the next visit starts from the impersonated user's
 * (short-lived) token rather than silently restoring admin rights.
 */
export const impersonatorStorage = {
  get(): ImpersonatorSession | null {
    try {
      const raw = sessionStorage.getItem(IMPERSONATOR_KEY)
      return raw ? (JSON.parse(raw) as ImpersonatorSession) : null
    } catch {
      return null
    }
  },
  set(session: ImpersonatorSession): void {
    try {
      sessionStorage.setItem(IMPERSONATOR_KEY, JSON.stringify(session))
    } catch {
      /* storage unavailable — impersonation still works, but "return" falls back to signing in again */
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(IMPERSONATOR_KEY)
    } catch {
      /* no-op */
    }
  },
}
