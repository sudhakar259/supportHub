import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/feedback/ToastProvider'
import { authApi } from '@/features/auth/api/authApi'
import { AccountSecurityPage } from '@/features/account/pages/AccountSecurityPage'
import { ApiError } from '@/types/api'
import type { User } from '@/types/user'

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,AAAA') } }))
vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    me: vi.fn(),
    twoFactorSetup: vi.fn(),
    twoFactorConfirm: vi.fn(),
    twoFactorDisable: vi.fn(),
    twoFactorRegenerateCodes: vi.fn(),
  },
}))

const base: User = {
  id: 1, name: 'Alex', email: 'alex@example.test', phone: null, avatarPath: null, timezone: 'UTC', isActive: true,
  emailVerifiedAt: '2026-10-11', lastLoginAt: null, roles: ['Agent'], permissions: [], departments: [], customer: null,
}

let current: User
const setUser = vi.fn((u: User) => {
  current = u
})
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: current, setUser }) }))

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AccountSecurityPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('AccountSecurityPage', () => {
  beforeEach(() => {
    current = { ...base, twoFactorEnabled: false }
    vi.clearAllMocks()
  })

  it('walks through turning it on: password, scan, code, then shows the recovery codes once', async () => {
    vi.mocked(authApi.twoFactorSetup).mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP' })
    vi.mocked(authApi.twoFactorConfirm).mockResolvedValue(['aaaaa-bbbbb', 'ccccc-ddddd'])
    vi.mocked(authApi.me).mockResolvedValue({ ...base, twoFactorEnabled: true, twoFactorRecoveryCodesRemaining: 2 })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /^turn on$/i }))
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'Correct!Horse9' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument()
    expect(authApi.twoFactorSetup).toHaveBeenCalledWith('Correct!Horse9')
    expect(await screen.findByAltText(/qr code/i)).toHaveAttribute('src', 'data:image/png;base64,AAAA')

    const confirm = screen.getByRole('button', { name: /^turn on$/i })
    expect(confirm).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/6-digit code/i), { target: { value: '123456' } })
    fireEvent.click(confirm)

    expect(await screen.findByLabelText('Recovery codes')).toHaveTextContent('aaaaa-bbbbb')
    expect(authApi.twoFactorConfirm).toHaveBeenCalledWith('123456')
    expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ twoFactorEnabled: true }))

    fireEvent.click(screen.getByRole('button', { name: /i have saved them/i }))
    expect(screen.queryByLabelText('Recovery codes')).not.toBeInTheDocument()
  })

  it('shows why a wrong password or code was refused and stays on the same step', async () => {
    vi.mocked(authApi.twoFactorSetup).mockRejectedValue(new ApiError('Validation failed.', 422, { password: ['The password is incorrect.'] }))
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /^turn on$/i }))
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The password is incorrect.')
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
  })

  it('shows the state when it is on, and turns it off with password and a recovery code', async () => {
    current = { ...base, twoFactorEnabled: true, twoFactorRecoveryCodesRemaining: 5 }
    vi.mocked(authApi.twoFactorDisable).mockResolvedValue()
    vi.mocked(authApi.me).mockResolvedValue({ ...base, twoFactorEnabled: false })
    renderPage()

    expect(screen.getByText('On')).toBeInTheDocument()
    expect(screen.getByText(/5/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^turn off$/i }))
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'Correct!Horse9' } })
    fireEvent.change(screen.getByLabelText(/authenticator code or recovery code/i), { target: { value: 'ab12c-d34ef' } })
    fireEvent.click(screen.getByRole('button', { name: /^turn off$/i }))

    await waitFor(() =>
      expect(authApi.twoFactorDisable).toHaveBeenCalledWith({ password: 'Correct!Horse9', code: undefined, recoveryCode: 'ab12c-d34ef' }),
    )
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ twoFactorEnabled: false })))
  })

  it('replaces recovery codes after confirming with password and a current code', async () => {
    current = { ...base, twoFactorEnabled: true, twoFactorRecoveryCodesRemaining: 1 }
    vi.mocked(authApi.twoFactorRegenerateCodes).mockResolvedValue(['new11-new22'])
    vi.mocked(authApi.me).mockResolvedValue({ ...current })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /get new recovery codes/i }))
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'Correct!Horse9' } })
    fireEvent.change(screen.getByLabelText(/6-digit code/i), { target: { value: '654321' } })
    fireEvent.click(screen.getByRole('button', { name: /get new codes/i }))

    expect(await screen.findByLabelText('Recovery codes')).toHaveTextContent('new11-new22')
    expect(authApi.twoFactorRegenerateCodes).toHaveBeenCalledWith({ password: 'Correct!Horse9', code: '654321' })
  })
})
