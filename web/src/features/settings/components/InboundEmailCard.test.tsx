import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/feedback/ToastProvider'
import { inboundEmailApi } from '@/features/settings/api/inboundEmailApi'
import type { InboundEmailState } from '@/features/settings/api/inboundEmailApi'
import { InboundEmailCard } from '@/features/settings/components/InboundEmailCard'

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, permissions: ['settings.view', 'settings.manage'], roles: ['Administrator'] } }),
}))
vi.mock('@/features/settings/api/inboundEmailApi', () => ({ inboundEmailApi: { get: vi.fn(), update: vi.fn() } }))

const base: InboundEmailState = {
  available: true,
  address: 'crevol@inbound.example.com',
  enabled: false,
  createCustomers: true,
  recent: [
    { id: 1, fromEmail: 'jamie@example.com', fromName: 'Jamie', subject: 'Cannot log in', status: 'ticket_created', ticketId: '01ABC', attachmentsSaved: 0, attachmentsSkipped: 0, note: null, receivedAt: new Date().toISOString() },
    { id: 2, fromEmail: 'bot@example.com', fromName: null, subject: 'Out of office', status: 'ignored_auto_generated', ticketId: null, attachmentsSaved: 0, attachmentsSkipped: 0, note: null, receivedAt: new Date().toISOString() },
  ],
}

function renderCard() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <InboundEmailCard />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('InboundEmailCard', () => {
  beforeEach(() => {
    vi.mocked(inboundEmailApi.get).mockResolvedValue(base)
    vi.mocked(inboundEmailApi.update).mockImplementation(async (p) => ({ ...base, enabled: p.enabled, createCustomers: p.createCustomers }))
  })

  it('shows the forwarding address and what happened to recent emails', async () => {
    renderCard()

    expect(await screen.findByText('crevol@inbound.example.com')).toBeInTheDocument()
    expect(screen.getByText('Cannot log in')).toBeInTheDocument()
    expect(screen.getByText('Ticket created')).toBeInTheDocument()
    expect(screen.getByText('Ignored: automatic mail')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open ticket/i })).toHaveAttribute('href', '/tickets/01ABC')
  })

  it('turns the feature on with the switch', async () => {
    renderCard()
    await screen.findByText('crevol@inbound.example.com')

    fireEvent.click(screen.getAllByRole('checkbox')[0])

    await waitFor(() => expect(inboundEmailApi.update).toHaveBeenCalledWith({ enabled: true, createCustomers: true }))
  })

  it('explains when the platform has no inbound domain, and offers no switch to turn it on', async () => {
    vi.mocked(inboundEmailApi.get).mockResolvedValue({ ...base, available: false, address: null, recent: [] })
    renderCard()

    expect(await screen.findByText(/not set up on this platform yet/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })
})
