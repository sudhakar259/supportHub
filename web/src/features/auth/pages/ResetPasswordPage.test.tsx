import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authApi } from '@/features/auth/api/authApi'
import { AuthProvider } from '@/features/auth/hooks/useAuth'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { ApiError } from '@/types/api'

vi.mock('@/features/auth/api/authApi', () => ({ authApi: { me: vi.fn(), resetPassword: vi.fn(), forgotPassword: vi.fn() } }))
vi.mock('@/features/workspaces/workspace', async (importOriginal) => ({ ...(await importOriginal<object>()), workspaceSlug: () => null }))

const STRONG = 'Str0ng!Passw0rd#1'
const LINK = '/reset-password?token=abc123&email=jamie%40example.com&tenant=crevol'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/login" element={<p>sign in page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function fillPasswords(value = STRONG) {
  fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value } })
  fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value } })
}

describe('reset password page', () => {
  beforeEach(() => {
    vi.mocked(authApi.resetPassword).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('sends the token, email and workspace from the link along with the new password', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue()
    renderAt(LINK)

    fillPasswords()
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() =>
      expect(authApi.resetPassword).toHaveBeenCalledWith({ token: 'abc123', email: 'jamie@example.com', tenant: 'crevol', password: STRONG, passwordConfirmation: STRONG }),
    )
    expect(await screen.findByText(/credentials updated successfully/i)).toBeInTheDocument()
  })

  it('takes the person to sign in after a successful reset', async () => {
    vi.mocked(authApi.resetPassword).mockResolvedValue()
    renderAt(LINK)
    fillPasswords()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    fireEvent.click(screen.getByRole('button', { name: /update password/i }))
    await screen.findByText(/credentials updated successfully/i)
    await vi.advanceTimersByTimeAsync(2000)

    expect(await screen.findByText('sign in page')).toBeInTheDocument()
  })

  it('says the link is expired or used, and offers a new one that already knows the email', async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(new ApiError('Validation failed.', 422, { email: ['This password reset token is invalid or has expired.'] }))
    renderAt(LINK)

    fillPasswords()
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(await screen.findByText(/expired or has already been used/i)).toBeInTheDocument()
    expect(screen.queryByText('Validation failed.')).not.toBeInTheDocument()

    const newLink = screen.getByRole('link', { name: /request a new link/i })
    expect(newLink).toHaveAttribute('href', '/forgot-password?email=jamie%40example.com')

    fireEvent.click(newLink)
    expect(await screen.findByDisplayValue('jamie@example.com')).toBeInTheDocument()
  })

  it('shows the password rule the server rejected, without offering a new link', async () => {
    vi.mocked(authApi.resetPassword).mockRejectedValue(new ApiError('Validation failed.', 422, { password: ['This password has appeared in a data leak.'] }))
    renderAt(LINK)

    fillPasswords()
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    expect(await screen.findByText('This password has appeared in a data leak.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /request a new link/i })).not.toBeInTheDocument()
  })

  it('does not show the form for a link that is missing its token or email', () => {
    renderAt('/reset-password?email=jamie%40example.com')

    expect(screen.getByText(/this reset link is incomplete/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /update password/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /request a new link/i })).toBeInTheDocument()
  })

  it('keeps the button off until the password is strong and confirmed', () => {
    renderAt(LINK)
    const button = screen.getByRole('button', { name: /update password/i })

    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'weak' } })
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: 'weak' } })
    expect(button).toBeDisabled()
    fillPasswords()
    expect(button).toBeEnabled()
    fireEvent.change(screen.getByLabelText(/confirm/i), { target: { value: STRONG + 'x' } })
    expect(button).toBeDisabled()
  })
})
