import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TicketFiltersBar } from '@/features/tickets/components/TicketFiltersBar'
import type { TicketFilters } from '@/types/ticket'

describe('TicketFiltersBar', () => {
  it('gives every filter control an accessible name', () => {
    render(
      <TicketFiltersBar
        filters={{} as TicketFilters}
        onChange={vi.fn()}
        statuses={[]}
        priorities={[]}
        departments={[]}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Search tickets' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by priority' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by department' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by SLA status' })).toBeInTheDocument()
  })
})
