import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/features/auth/hooks/useAuth'
import { tenantsApi } from '@/features/tenants/api/tenantsApi'
import { WorkspaceFinder } from './WorkspaceFinder'

vi.mock('@/features/tenants/api/tenantsApi', () => ({ tenantsApi: { lookupSlug: vi.fn() } }))

beforeEach(() => vi.mocked(tenantsApi.lookupSlug).mockReset())

function openFinder() {
  render(<MemoryRouter><AuthProvider><WorkspaceFinder /></AuthProvider></MemoryRouter>)
}

describe('workspace sign-in finder', () => {
  it('explains a missing workspace before asking for credentials', async () => {
    vi.mocked(tenantsApi.lookupSlug).mockResolvedValue({ available: true })
    openFinder()
    fireEvent.change(screen.getByLabelText(/Workspace ID/), { target: { value: 'Missing-Workspace' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue to workspace' }))
    expect(await screen.findByText(/couldn’t find that workspace/i)).toBeInTheDocument()
    expect(tenantsApi.lookupSlug).toHaveBeenCalledWith('missing-workspace')
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('allows retry after the availability service fails', async () => {
    vi.mocked(tenantsApi.lookupSlug).mockResolvedValue(null)
    openFinder()
    fireEvent.change(screen.getByLabelText(/Workspace ID/), { target: { value: 'crevol' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue to workspace' }))
    expect(await screen.findByText(/couldn’t check your workspace/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue to workspace' })).toBeEnabled())
  })

  it('rejects reserved names without sending an availability request', async () => {
    openFinder()
    fireEvent.change(screen.getByLabelText(/Workspace ID/), { target: { value: 'api' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue to workspace' }))
    expect(await screen.findByText(/use your workspace id/i)).toBeInTheDocument()
    expect(tenantsApi.lookupSlug).not.toHaveBeenCalled()
  })
})
