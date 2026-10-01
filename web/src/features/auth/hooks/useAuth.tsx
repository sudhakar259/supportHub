import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { authApi } from '@/features/auth/api/authApi'
import type { LoginCredentials } from '@/features/auth/types'
import { tokenStorage } from '@/services/storage/tokenStorage'
import type { User } from '@/types/user'

interface AuthContextValue {
  user: User | null
  /** True while restoring a session from a stored token on initial load. */
  isBootstrapping: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<User>
  logout: () => Promise<void>
  /** Updates the cached user (e.g. after email verification) without a full re-fetch. */
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    const token = tokenStorage.get()
    if (!token) {
      setIsBootstrapping(false)
      return
    }

    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setIsBootstrapping(false))
  }, [])

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
    () => ({ user, isBootstrapping, isAuthenticated: user !== null, login, logout, setUser }),
    [user, isBootstrapping, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
