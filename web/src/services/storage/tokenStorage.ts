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
