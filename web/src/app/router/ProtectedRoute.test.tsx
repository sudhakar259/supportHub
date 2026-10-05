import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { useAuth } from '@/features/auth/hooks/useAuth'

vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: vi.fn() }))

const mockedUseAuth = vi.mocked(useAuth)

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ProtectedRoute />
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset()
  })

  it('offers a retry instead of signing out when the session could not be checked', () => {
    const retrySession = vi.fn()
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
      sessionError: 'Too many requests. Please try again later.',
      retrySession,
    } as unknown as ReturnType<typeof useAuth>)

    renderRoute()

    expect(screen.getByText('We could not restore your session')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }))
    expect(retrySession).toHaveBeenCalledOnce()
  })
})
