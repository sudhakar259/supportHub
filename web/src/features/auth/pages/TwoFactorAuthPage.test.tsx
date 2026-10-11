import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/features/auth/hooks/useAuth'
import { authApi } from '@/features/auth/api/authApi'
import { TwoFactorAuthPage } from '@/features/auth/pages/TwoFactorAuthPage'
import { tokenStorage } from '@/services/storage/tokenStorage'
import { ApiError } from '@/types/api'
import type { User } from '@/types/user'

vi.mock('@/features/auth/api/authApi', () => ({ authApi: { me: vi.fn(), twoFactorChallenge: vi.fn() } }))

const user: User = {
  id: 1, name: 'Alex', email: 'alex@example.test', phone: null, avatarPath: null, timezone: 'UTC', isActive: true,
  emailVerifiedAt: '2026-10-11', lastLoginAt: null, roles: ['Agent'], permissions: [], departments: [], customer: null,
}

function renderPage(state: unknown = { challengeToken: 'chal-1' }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/two-factor', state }]}>
      <AuthProvider>
        <Routes>
          <Route path="/two-factor" element={<TwoFactorAuthPage />} />
          <Route path="/dashboard" element={<p>dashboard reached</p>} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function typeCode(code: string) {
  const boxes = screen.getAllByRole('textbox')
  code.split('').forEach((digit, i) => fireEvent.change(boxes[i], { target: { value: digit } }))
}

describe('TwoFactorAuthPage', () => {
  beforeEach(() => {
    tokenStorage.clear()
    vi.mocked(authApi.twoFactorChallenge).mockReset()
  })

  it('sends someone who arrived without signing in back to the login page', () => {
    renderPage(null)

    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('signs in with the 6-digit code and stores the session', async () => {
    vi.mocked(authApi.twoFactorChallenge).mockResolvedValue({ user, token: 'real-token' })
    renderPage()

    typeCode('123456')
    fireEvent.click(screen.getByRole('button', { name: /verify and sign in/i }))

    expect(await screen.findByText('dashboard reached')).toBeInTheDocument()
    expect(authApi.twoFactorChallenge).toHaveBeenCalledWith({ challengeToken: 'chal-1', code: '123456', recoveryCode: undefined })
    expect(tokenStorage.get()).toBe('real-token')
  })

  it('does not call the server for an incomplete code', () => {
    renderPage()

    typeCode('123')
    fireEvent.click(screen.getByRole('button', { name: /verify and sign in/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/6-digit code/i)
    expect(authApi.twoFactorChallenge).not.toHaveBeenCalled()
  })

  it('shows the server’s reason when the code is wrong and does not sign in', async () => {
    vi.mocked(authApi.twoFactorChallenge).mockRejectedValue(new ApiError('Validation failed.', 422, { code: ['The code is incorrect or has expired.'] }))
    renderPage()

    typeCode('000000')
    fireEvent.click(screen.getByRole('button', { name: /verify and sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The code is incorrect or has expired.')
    expect(tokenStorage.get()).toBeNull()
  })

  it('shows the lockout message from the server', async () => {
    vi.mocked(authApi.twoFactorChallenge).mockRejectedValue(new ApiError('Too many failed sign-in attempts. This account is locked for another 15 minutes.', 423))
    renderPage()

    typeCode('000000')
    fireEvent.click(screen.getByRole('button', { name: /verify and sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/locked for another 15 minutes/i)
  })

  it('switches to a recovery code and sends it instead of a code', async () => {
    vi.mocked(authApi.twoFactorChallenge).mockResolvedValue({ user, token: 'real-token' })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /can.t use my authenticator app/i }))
    fireEvent.change(screen.getByLabelText(/recovery code/i), { target: { value: 'ab12c-d34ef' } })
    fireEvent.click(screen.getByRole('button', { name: /verify and sign in/i }))

    await waitFor(() => expect(authApi.twoFactorChallenge).toHaveBeenCalledWith({ challengeToken: 'chal-1', code: undefined, recoveryCode: 'ab12c-d34ef' }))
  })
})
