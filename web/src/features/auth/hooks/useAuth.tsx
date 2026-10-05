import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { authApi } from '@/features/auth/api/authApi'
import type { LoginCredentials } from '@/features/auth/types'
import { tokenStorage } from '@/services/storage/tokenStorage'
import { ApiError } from '@/types/api'
import type { User } from '@/types/user'
import { isPlatformAdmin as checkIsPlatformAdmin } from '@/types/user'

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
  login: (credentials: LoginCredentials) => Promise<User>
  logout: () => Promise<void>
  /** Updates the cached user (e.g. after email verification) without a full re-fetch. */
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const restoreSession = useCallback(() => {
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
        if (error instanceof ApiError && error.status === 401) {
          tokenStorage.clear()
          return
        }
        setSessionError(error instanceof ApiError ? error.message : 'We could not reach the server. Please try again.')
      })
      .finally(() => setIsBootstrapping(false))
  }, [])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { user: loggedInUser, token } = await authApi.login(credentials)
    tokenStorage.set(token)
    setUser(loggedInUser)
    return loggedInUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      tokenStorage.clear()
      setUser(null)
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
      logout,
      setUser,
    }),
    [user, isBootstrapping, sessionError, restoreSession, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
