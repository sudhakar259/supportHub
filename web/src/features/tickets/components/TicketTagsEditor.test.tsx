import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/feedback/ToastProvider'
import { ticketsApi } from '@/features/tickets/api/ticketsApi'
import { TicketTagsEditor } from '@/features/tickets/components/TicketTagsEditor'

vi.mock('@/features/tickets/api/ticketsApi', () => ({ ticketsApi: { setTags: vi.fn(), listTags: vi.fn() } }))

function renderEditor(props: Partial<React.ComponentProps<typeof TicketTagsEditor>> = {}) {
  const onChange = vi.fn()
  render(
    <ToastProvider>
      <TicketTagsEditor ticketId="T1" tags={['vip']} onChange={onChange} {...props} />
    </ToastProvider>,
  )
  return onChange
}

describe('TicketTagsEditor', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.listTags).mockResolvedValue(['vip', 'refund'])
    vi.mocked(ticketsApi.setTags).mockImplementation(async (_id, tags) => tags)
  })

  it('adds a tag with Enter, lower-cased, and reports the saved list', async () => {
    const onChange = renderEditor()

    const input = screen.getByLabelText('Add a tag')
    fireEvent.change(input, { target: { value: '  Refund ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(ticketsApi.setTags).toHaveBeenCalledWith('T1', ['vip', 'refund']))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['vip', 'refund']))
  })

  it('removes a tag', async () => {
    const onChange = renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Remove tag vip' }))

    await waitFor(() => expect(ticketsApi.setTags).toHaveBeenCalledWith('T1', []))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([]))
  })

  it('ignores a tag that is already on the ticket', async () => {
    renderEditor()
    const input = screen.getByLabelText('Add a tag')
    fireEvent.change(input, { target: { value: 'VIP' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''))
    expect(ticketsApi.setTags).not.toHaveBeenCalled()
  })

  it('shows tags without any controls to someone who cannot edit them', () => {
    renderEditor({ readOnly: true })

    expect(screen.getByText('#vip')).toBeInTheDocument()
    expect(screen.queryByLabelText('Add a tag')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove tag/i })).not.toBeInTheDocument()
  })
})
