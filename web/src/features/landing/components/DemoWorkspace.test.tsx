import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DemoWorkspace } from '@/features/landing/components/DemoWorkspace'

describe('interactive product tour', () => {
  it('keeps private notes out of the customer view while preserving public replies', () => {
    render(<DemoWorkspace />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Write a reply' }), {
      target: { value: 'Here is your updated invoice.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
    fireEvent.click(screen.getByRole('button', { name: 'Private note' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Write a private note' }), {
      target: { value: 'Check the adjustment with Billing.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add private note' }))
    expect(screen.getByText('Check the adjustment with Billing.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Customer view' }))
    expect(screen.queryByText('Check the adjustment with Billing.')).not.toBeInTheDocument()
    expect(screen.getByText('Here is your updated invoice.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Agent view' }))
    expect(screen.getByText('Check the adjustment with Billing.')).toBeInTheDocument()
  })

  it('keeps replies attached to the selected ticket', () => {
    render(<DemoWorkspace />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A reply only for Jamie.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
    fireEvent.click(screen.getByRole('button', { name: /sam chen/i }))
    expect(screen.queryByText('A reply only for Jamie.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /jamie rivera/i }))
    expect(screen.getByText('A reply only for Jamie.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
  })

  it('updates report counts after resolution and resets the sample workspace', () => {
    render(<DemoWorkspace />)
    fireEvent.click(screen.getByRole('button', { name: 'Resolve ticket' }))
    expect(screen.getByRole('button', { name: 'Reopen ticket' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /reports/i }))
    const resolvedTile = screen.getByText('Resolved').parentElement!
    expect(within(resolvedTile).getByText('1')).toBeInTheDocument()
    const openTile = screen.getByText('Open').parentElement!
    expect(within(openTile).getByText('2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reset demo' }))
    expect(screen.getByRole('button', { name: 'Resolve ticket' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/demo reset/i)
  })

  it('lets visitors explore routing rules without changing live configuration', () => {
    render(<DemoWorkspace />)
    fireEvent.click(screen.getByRole('button', { name: /routing/i }))
    const rule = screen.getByRole('switch', { name: 'Send invoice questions to Billing' })
    expect(rule).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(rule)
    expect(rule).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/do not route real tickets/i)).toBeInTheDocument()
  })
})
