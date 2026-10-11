import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { authApi } from '@/features/auth/api/authApi'
import type { LoginCredentials, LoginResult, TwoFactorChallengePayload } from '@/features/auth/types'
import { impersonatorStorage, tokenStorage } from '@/services/storage/tokenStorage'
import { usersApi } from '@/features/users/api/usersApi'
import { ApiError } from '@/types/api'
import type { User } from '@/types/user'
import { isPlatformAdmin as checkIsPlatformAdmin } from '@/types/user'
import { workspaceSlug } from '@/features/workspaces/workspace'

interface AuthContextValue {
  user: User | null
  /** True while restoring a session from a stored token on initial load. */
  isBootstrapping: boolean
  /** Set when the stored session could not be checked for a reason other than an expired token. */
  sessionError: string | null
  retrySession: () => void
  isAuthenticated: boolean
  /** True for the tenant-less Platform Admin population — see types/user.ts. */
  isPlatformAdmin: boolean
  login: (credentials: LoginCredentials) => Promise<LoginResult>
  /** Second step for accounts with two-factor on: trade the code for a session. */
  completeTwoFactor: (payload: TwoFactorChallengePayload) => Promise<User>
  logout: () => Promise<void>
  /** Set while an administrator is "logged in as" someone else; null otherwise. */
  impersonator: { name: string } | null
  /** Administrator only: switch this browser session to act as another user. */
  startImpersonation: (userId: number) => Promise<void>
  /** Drop the impersonated session and go back to the administrator's own account. */
  stopImpersonation: () => Promise<void>
  /** Updates the cached user (e.g. after email verification) without a full re-fetch. */
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [hasWorkspaceHandoff] = useState(() => Boolean(typeof window !== 'undefined' && workspaceSlug() && new URLSearchParams(window.location.hash.slice(1)).get('workspace-session')))
  const [impersonator] = useState(() => {
    const session = impersonatorStorage.get()
    return session ? { name: session.name } : null
  })

  const restoreSession = useCallback(() => {
    if (hasWorkspaceHandoff) {
      tokenStorage.clear()
      setIsBootstrapping(false)
      return
    }
    if (!tokenStorage.get()) {
      setIsBootstrapping(false)
      return
    }

    setIsBootstrapping(true)
    setSessionError(null)

    authApi
      .me()
      .then(setUser)
      .catch((error: unknown) => {
        if (error instanceof ApiError && (error.status === 401 || (error.status === 403 && workspaceSlug()))) {
          tokenStorage.clear()
          return
        }
        setSessionError(error instanceof ApiError ? error.message : 'We could not reach the server. Please try again.')
      })
      .finally(() => setIsBootstrapping(false))
  }, [hasWorkspaceHandoff])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    const result = await authApi.login(credentials)
    if ('challengeToken' in result) return { status: 'two_factor', challengeToken: result.challengeToken }

    tokenStorage.set(result.token)
    setUser(result.user)
    return { status: 'authenticated', user: result.user }
  }, [])

  const completeTwoFactor = useCallback(async (payload: TwoFactorChallengePayload) => {
    const { user: loggedInUser, token } = await authApi.twoFactorChallenge(payload)
    tokenStorage.set(token)
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      tokenStorage.clear()
      impersonatorStorage.clear()
      setUser(null)
    }
  }, [])

  // Both switches end in a full page load so no cached data (tickets, lookups,
  // permissions) from the previous identity can leak into the next one.
  const startImpersonation = useCallback(
    async (userId: number) => {
      const adminToken = tokenStorage.get()
      const { token } = await usersApi.impersonate(userId)
      if (adminToken && user) impersonatorStorage.set({ token: adminToken, name: user.name })
      tokenStorage.set(token)
      window.location.assign('/dashboard')
    },
    [user],
  )

  const stopImpersonation = useCallback(async () => {
    const session = impersonatorStorage.get()
    try {
      await authApi.logout() // revokes the impersonation token
    } catch {
      /* token already expired or revoked — nothing left to clean up server-side */
    }
    impersonatorStorage.clear()
    if (session) {
      tokenStorage.set(session.token)
      window.location.assign('/users')
    } else {
      tokenStorage.clear()
      window.location.assign('/login')
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      sessionError,
      retrySession: restoreSession,
      isAuthenticated: user !== null,
      isPlatformAdmin: checkIsPlatformAdmin(user),
      login,
      completeTwoFactor,
      logout,
      impersonator,
      startImpersonation,
      stopImpersonation,
      setUser,
    }),
    [user, isBootstrapping, sessionError, restoreSession, login, completeTwoFactor, logout, impersonator, startImpersonation, stopImpersonation],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
