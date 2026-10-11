import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authApi } from '@/features/auth/api/authApi'
import { AuthProvider } from '@/features/auth/hooks/useAuth'
import { EmailVerificationPage } from '@/features/auth/pages/EmailVerificationPage'

vi.mock('@/features/auth/api/authApi', () => ({ authApi: { me: vi.fn(), resendVerification: vi.fn() } }))
vi.mock('@/features/workspaces/workspace', async (importOriginal) => ({ ...(await importOriginal<object>()), workspaceSlug: () => null }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <EmailVerificationPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('email verification page', () => {
  beforeEach(() => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('signed out'))
  })

  it('confirms the email after the emailed link worked', async () => {
    renderAt('/email-verification?verified=1')

    expect(await screen.findByRole('heading', { name: /email verified/i })).toBeInTheDocument()
    const link = screen.getAllByRole('link').find((a) => a.textContent?.includes('arrow_forward') && /sign in/i.test(a.textContent))
    expect(link).toHaveAttribute('href', '/login')
  })

  it('says the link expired, and points to signing in for a new one', async () => {
    renderAt('/email-verification?verified=0&reason=expired')

    expect(await screen.findByRole('heading', { name: /this link has expired/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in to get a new link/i })).toHaveAttribute('href', '/login')
  })

  it('says the link is not valid when it was tampered with', async () => {
    renderAt('/email-verification?verified=0&reason=invalid')

    expect(await screen.findByRole('heading', { name: /this link is not valid/i })).toBeInTheDocument()
  })

  it('still shows the check-your-inbox step when there is no result in the address', async () => {
    renderAt('/email-verification')

    expect(await screen.findByRole('heading', { name: /check your inbox/i })).toBeInTheDocument()
  })
})
