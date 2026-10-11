import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/features/auth/hooks/useAuth'
import { tenantsApi } from '@/features/tenants/api/tenantsApi'
import { RegistrationPage } from '@/features/tenants/pages/RegistrationPage'
import type { TenantLookupResult } from '@/features/tenants/types'
import { tokenStorage } from '@/services/storage/tokenStorage'
import type { User } from '@/types/user'

vi.mock('@/features/tenants/api/tenantsApi', () => ({ tenantsApi: { register: vi.fn(), lookupSlug: vi.fn() } }))

function renderRegistration() {
  return render(
    <MemoryRouter initialEntries={['/register?plan=professional']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/email-verification" element={<h1>Verify your email</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function fillForm() {
  fireEvent.change(screen.getByLabelText(/Organization Name/), { target: { value: 'Our Team' } })
  fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: 'Alex Morgan' } })
  fireEvent.change(screen.getByLabelText(/Work Email/), { target: { value: 'alex@example.test' } })
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'Testing1234!' } })
  fireEvent.change(screen.getByLabelText(/Confirm Password/), { target: { value: 'Testing1234!' } })
  fireEvent.click(screen.getByRole('checkbox', { name: /i agree to the terms/i }))
}

beforeEach(() => {
  vi.mocked(tenantsApi.register).mockReset()
  vi.mocked(tenantsApi.lookupSlug).mockReset()
  // After signing up, the page asks the real API to hand the session to the new workspace's address. Only the
  // tenant API is mocked here, so without this that call goes to whatever API address is configured: a developer's
  // running server answers it (and the session is cleared), a clean machine has none. Pin it to "offline" so the
  // test behaves the same everywhere and exercises the page's fallback.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('public workspace signup', () => {
  it('does not report an ID as available when the check is unavailable', async () => {
    vi.mocked(tenantsApi.lookupSlug).mockResolvedValue(null)
    renderRegistration()
    fillForm()
    fireEvent.blur(screen.getByLabelText(/Workspace ID/))
    expect(await screen.findByRole('status')).toHaveTextContent(/couldn’t check this id/i)
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeEnabled()
    expect(screen.queryByText(/desknu.io/i)).not.toBeInTheDocument()
  })

  it('ignores a stale slug response after the organization name changes', async () => {
    let finishCheck: (result: TenantLookupResult) => void = () => {}
    vi.mocked(tenantsApi.lookupSlug).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishCheck = resolve
        }),
    )
    renderRegistration()
    fillForm()
    fireEvent.blur(screen.getByLabelText(/Workspace ID/))
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Organization Name/), { target: { value: 'A Different Team' } })
    await act(async () => {
      finishCheck({ available: false })
    })
    expect(screen.getByLabelText(/Workspace ID/)).toHaveValue('a-different-team')
    expect(screen.queryByText('This slug is already taken.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeEnabled()
  })

  it('prevents submission when the current workspace ID is taken', async () => {
    vi.mocked(tenantsApi.lookupSlug).mockResolvedValue({ available: false })
    renderRegistration()
    fillForm()
    fireEvent.blur(screen.getByLabelText(/Workspace ID/))
    expect(await screen.findByText('This slug is already taken.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeDisabled()
  })

  it('passes the selected plan to registration, stores the session and moves to verification', async () => {
    const user: User = {
      id: 1,
      name: 'Alex Morgan',
      email: 'alex@example.test',
      phone: null,
      avatarPath: null,
      timezone: 'UTC',
      isActive: true,
      emailVerifiedAt: null,
      lastLoginAt: null,
      roles: ['Administrator'],
      permissions: [],
      departments: [],
      customer: null,
    }
    vi.mocked(tenantsApi.register).mockResolvedValue({ user, token: 'new-workspace-token' })
    renderRegistration()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }))
    await waitFor(() =>
      expect(tenantsApi.register).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantName: 'Our Team',
          tenantSlug: 'our-team',
          ownerEmail: 'alex@example.test',
          plan: 'professional',
          timezone: expect.any(String),
        }),
      ),
    )
    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeInTheDocument()
    expect(tokenStorage.get()).toBe('new-workspace-token')
  })
})
