import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { ToastProvider } from '@/components/feedback/ToastProvider'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { developerDocsApi } from '@/features/integrations/api/developerDocsApi'
import type { DeveloperDocumentation } from '@/features/integrations/api/developerDocsApi'
import { DeveloperDocsPage } from './DeveloperDocsPage'

vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/features/integrations/api/developerDocsApi', () => ({
  developerDocsApi: { get: vi.fn(), download: vi.fn() },
}))

const documentation: DeveloperDocumentation = {
  guide: '# Integration guide\n\n## Credentials\n\nKeep your secret on the server.\n\n| Header | Value |\n| --- | --- |\n| X-Api-Key | Your key |',
  baseUrl: 'https://api.example.test',
  reference: [{
    name: 'Integration API — Tickets',
    item: [{
      name: 'Create a ticket',
      request: {
        method: 'POST',
        url: { raw: '{{baseUrl}}/api/v1/integration/tickets', path: 'api/v1/integration/tickets' },
        header: [{ key: 'X-Api-Key', value: '<YOUR_KEY>' }, { key: 'X-Api-Secret', value: '<YOUR_SECRET>' }],
        body: { mode: 'raw', raw: JSON.stringify({ subject: "Customer's question" }) },
      },
      response: [{ code: 201, body: '{"success":true}' }],
    }],
  }, {
    name: 'Administration',
    item: [{ name: 'List users', request: { method: 'GET', url: '{{baseUrl}}/api/v1/users' } }],
  }],
}

function renderDocs() {
  return render(
    <MemoryRouter initialEntries={['/integrations/developer-docs']}>
      <ToastProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/integrations/developer-docs" element={<DeveloperDocsPage />} />
          </Route>
          <Route path="/login" element={<p>Sign in to your workspace</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('private developer documentation', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, isBootstrapping: false } as ReturnType<typeof useAuth>)
    vi.mocked(developerDocsApi.get).mockReset().mockResolvedValue(documentation)
    vi.mocked(developerDocsApi.download).mockReset().mockResolvedValue(undefined)
  })

  it('redirects guests without fetching or rendering documentation', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, isBootstrapping: false } as ReturnType<typeof useAuth>)
    renderDocs()

    expect(await screen.findByText('Sign in to your workspace')).toBeInTheDocument()
    expect(developerDocsApi.get).not.toHaveBeenCalled()
    expect(screen.queryByText('Keep your secret on the server.')).not.toBeInTheDocument()
  })

  it('waits for session restoration before fetching documentation', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, isBootstrapping: true } as ReturnType<typeof useAuth>)
    renderDocs()

    expect(screen.getByText('Restoring your session…')).toBeInTheDocument()
    expect(developerDocsApi.get).not.toHaveBeenCalled()
  })

  it('renders the private guide and downloads through the authenticated service', async () => {
    renderDocs()

    expect(await screen.findByText('Keep your secret on the server.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Credentials' })).toHaveAttribute('href', '#credentials')
    expect(screen.getByRole('table')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /OpenAPI/ }))
    await waitFor(() => expect(developerDocsApi.download).toHaveBeenCalledWith('openapi'))
    await waitFor(() => expect(screen.getByRole('button', { name: /Postman/ })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: /Postman/ }))
    await waitFor(() => expect(developerDocsApi.download).toHaveBeenCalledWith('postman'))
  })

  it('shows integration requests with key authentication and searches endpoint groups', async () => {
    renderDocs()
    await screen.findByText('Keep your secret on the server.')
    fireEvent.click(screen.getByRole('button', { name: /API reference/ }))

    expect(screen.getByText('Create a ticket')).toBeInTheDocument()
    expect(screen.queryByText('List users')).not.toBeInTheDocument()
    const example = screen.getByText(/curl --request POST/).textContent!
    expect(example).toContain('https://api.example.test/api/v1/integration/tickets')
    expect(example).toContain('X-Api-Key')
    expect(example).toContain('X-Api-Secret')
    expect(example).not.toContain('Authorization: Bearer')
    expect(example).toContain("Customer'\\''s question")
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } })
    expect(screen.getByText('No endpoints match your search.')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'users' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'all' } })
    expect(screen.getByText('List users')).toBeInTheDocument()
  })

  it('lets users retry a failed fetch without showing stale documentation', async () => {
    vi.mocked(developerDocsApi.get).mockRejectedValueOnce(new Error('Service unavailable'))
    renderDocs()

    expect(await screen.findByText('Service unavailable')).toBeInTheDocument()
    expect(screen.queryByText('Keep your secret on the server.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /OpenAPI/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }))
    expect(await screen.findByText('Keep your secret on the server.')).toBeInTheDocument()
  })
})
