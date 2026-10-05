import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AuthProvider, useAuth } from '@/features/auth/hooks/useAuth'
import { authApi } from '@/features/auth/api/authApi'
import { tokenStorage } from '@/services/storage/tokenStorage'
import { ApiError } from '@/types/api'

vi.mock('@/features/auth/api/authApi', () => ({ authApi: { me: vi.fn() } }))

function SessionProbe() {
  const { sessionError, isBootstrapping } = useAuth()
  if (isBootstrapping) return <p>checking</p>
  return <p>{sessionError ?? 'no error'}</p>
}

function renderProvider(children: ReactNode = <SessionProbe />) {
  return render(<AuthProvider>{children}</AuthProvider>)
}

describe('session restore', () => {
  it('keeps the stored token when the check fails for a reason other than an expired session', async () => {
    tokenStorage.set('stored-token')
    vi.mocked(authApi.me).mockRejectedValue(new ApiError('Too many requests.', 429))

    renderProvider()

    expect(await screen.findByText('Too many requests.')).toBeInTheDocument()
    expect(tokenStorage.get()).toBe('stored-token')
  })

  it('clears the stored token when the server reports the session has expired', async () => {
    tokenStorage.set('expired-token')
    vi.mocked(authApi.me).mockRejectedValue(new ApiError('Unauthenticated.', 401))

    renderProvider()

    await waitFor(() => expect(tokenStorage.get()).toBeNull())
    expect(screen.getByText('no error')).toBeInTheDocument()
  })
})
