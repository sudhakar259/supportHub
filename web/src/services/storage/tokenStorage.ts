const TOKEN_KEY = 'deskzeal.token'
const LEGACY_TOKEN_KEYS = ['desknu.token', 'supporthub.token']

// Move existing sessions to DeskZeal keys without forcing customers to sign in again.
function readMigrated(storage: Storage, key: string, legacyKeys: string[]): string | null {
  const current = storage.getItem(key)
  if (current !== null) return current
  for (const legacyKey of legacyKeys) {
    const legacy = storage.getItem(legacyKey)
    if (legacy === null) continue
    try {
      storage.setItem(key, legacy)
      legacyKeys.forEach((k) => storage.removeItem(k))
    } catch {
      // Reading may work when storage is full or writes are disabled.
      // Keep the existing session usable and retry migration on a later visit.
    }
    return legacy
  }
  return null
}

function removeAll(storage: Storage, ...keys: string[]): void {
  keys.forEach((k) => storage.removeItem(k))
}

/** Thin wrapper around localStorage so the storage mechanism can change without touching callers. */
export const tokenStorage = {
  get(): string | null {
    try {
      return readMigrated(localStorage, TOKEN_KEY, LEGACY_TOKEN_KEYS)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
      removeAll(localStorage, ...LEGACY_TOKEN_KEYS)
    } catch {
      /* storage unavailable (private browsing, etc.) — session simply won't persist across reloads */
    }
  },
  clear(): void {
    try {
      removeAll(localStorage, TOKEN_KEY, ...LEGACY_TOKEN_KEYS)
    } catch {
      /* no-op */
    }
  },
}

const IMPERSONATOR_KEY = 'deskzeal.impersonator'
const LEGACY_IMPERSONATOR_KEYS = ['desknu.impersonator', 'supporthub.impersonator']

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
      const raw = readMigrated(sessionStorage, IMPERSONATOR_KEY, LEGACY_IMPERSONATOR_KEYS)
      return raw ? (JSON.parse(raw) as ImpersonatorSession) : null
    } catch {
      return null
    }
  },
  set(session: ImpersonatorSession): void {
    try {
      sessionStorage.setItem(IMPERSONATOR_KEY, JSON.stringify(session))
      removeAll(sessionStorage, ...LEGACY_IMPERSONATOR_KEYS)
    } catch {
      /* storage unavailable — impersonation still works, but "return" falls back to signing in again */
    }
  },
  clear(): void {
    try {
      removeAll(sessionStorage, IMPERSONATOR_KEY, ...LEGACY_IMPERSONATOR_KEYS)
    } catch {
      /* no-op */
    }
  },
}
