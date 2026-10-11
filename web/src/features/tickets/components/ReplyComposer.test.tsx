import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReplyComposer } from '@/features/tickets/components/ReplyComposer'

function renderComposer(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(<ReplyComposer onSubmit={onSubmit} isSubmitting={false} canPostInternalNotes={false} />)
  return onSubmit
}

describe('ReplyComposer attachments', () => {
  it('sends the chosen files along with the reply and clears them afterwards', async () => {
    const onSubmit = renderComposer()
    const file = new File(['hello'], 'error.png', { type: 'image/png' })

    fireEvent.change(screen.getByLabelText(/attach files/i), { target: { files: [file] } })
    expect(await screen.findByText('error.png')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'See screenshot' } })
    fireEvent.click(screen.getByRole('button', { name: /send reply/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('See screenshot', false, [file]))
    await waitFor(() => expect(screen.queryByText('error.png')).not.toBeInTheDocument())
  })

  it('shows why a file was refused and does not attach it', async () => {
    renderComposer()
    fireEvent.change(screen.getByLabelText(/attach files/i), { target: { files: [new File(['x'], 'bundle.zip')] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/not an allowed file type/i)
    expect(screen.queryByLabelText('Files to attach')).not.toBeInTheDocument()
  })

  it('lets the user remove a file before sending', async () => {
    renderComposer()
    fireEvent.change(screen.getByLabelText(/attach files/i), { target: { files: [new File(['x'], 'notes.txt')] } })
    await screen.findByText('notes.txt')

    fireEvent.click(screen.getByRole('button', { name: /remove notes\.txt/i }))
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument()
  })
})
