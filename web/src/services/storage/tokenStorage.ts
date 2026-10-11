const TOKEN_KEY = 'desknu.token'
const LEGACY_TOKEN_KEY = 'supporthub.token'

// Move existing sessions to DeskNu keys without forcing customers to sign in again.
function readMigrated(storage: Storage, key: string, legacyKey: string): string | null {
  const current = storage.getItem(key)
  if (current !== null) return current
  const legacy = storage.getItem(legacyKey)
  if (legacy !== null) {
    try {
      storage.setItem(key, legacy)
      storage.removeItem(legacyKey)
    } catch {
      // Reading may work when storage is full or writes are disabled.
      // Keep the existing session usable and retry migration on a later visit.
    }
  }
  return legacy
}

/** Thin wrapper around localStorage so the storage mechanism can change without touching callers. */
export const tokenStorage = {
  get(): string | null {
    try {
      return readMigrated(localStorage, TOKEN_KEY, LEGACY_TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.removeItem(LEGACY_TOKEN_KEY)
    } catch {
      /* storage unavailable (private browsing, etc.) — session simply won't persist across reloads */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(LEGACY_TOKEN_KEY)
    } catch {
      /* no-op */
    }
  },
}

const IMPERSONATOR_KEY = 'desknu.impersonator'
const LEGACY_IMPERSONATOR_KEY = 'supporthub.impersonator'

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
      const raw = readMigrated(sessionStorage, IMPERSONATOR_KEY, LEGACY_IMPERSONATOR_KEY)
      return raw ? (JSON.parse(raw) as ImpersonatorSession) : null
    } catch {
      return null
    }
  },
  set(session: ImpersonatorSession): void {
    try {
      sessionStorage.setItem(IMPERSONATOR_KEY, JSON.stringify(session))
      sessionStorage.removeItem(LEGACY_IMPERSONATOR_KEY)
    } catch {
      /* storage unavailable — impersonation still works, but "return" falls back to signing in again */
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(IMPERSONATOR_KEY)
      sessionStorage.removeItem(LEGACY_IMPERSONATOR_KEY)
    } catch {
      /* no-op */
    }
  },
}
