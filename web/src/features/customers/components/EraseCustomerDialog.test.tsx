import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/feedback/ToastProvider'
import { customersApi } from '@/features/customers/api/customersApi'
import { EraseCustomerDialog } from '@/features/customers/components/EraseCustomerDialog'
import { ApiError } from '@/types/api'

vi.mock('@/features/customers/api/customersApi', () => ({ customersApi: { erase: vi.fn() } }))

function renderDialog() {
  const onClose = vi.fn()
  const onErased = vi.fn()
  render(
    <ToastProvider>
      <EraseCustomerDialog isOpen onClose={onClose} customerId={7} customerEmail="jamie@example.com" customerName="Jamie Rivera" onErased={onErased} />
    </ToastProvider>,
  )
  return { onClose, onErased }
}

const eraseButton = () => screen.getByRole('button', { name: /erase permanently/i })

describe('EraseCustomerDialog', () => {
  beforeEach(() => {
    vi.mocked(customersApi.erase).mockReset()
  })

  it('keeps the erase button disabled until the customer’s email is typed back exactly', () => {
    renderDialog()

    expect(eraseButton()).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/type jamie@example.com to confirm/i), { target: { value: 'jamie@example.co' } })
    expect(eraseButton()).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/type jamie@example.com to confirm/i), { target: { value: ' Jamie@Example.com ' } })
    expect(eraseButton()).toBeEnabled()
  })

  it('erases with content removal on by default and reports the result', async () => {
    vi.mocked(customersApi.erase).mockResolvedValue({ tickets: 2, messagesRedacted: 5, attachmentsRemoved: 1, redactedContent: true })
    const { onErased } = renderDialog()

    fireEvent.change(screen.getByLabelText(/type jamie@example.com to confirm/i), { target: { value: 'jamie@example.com' } })
    fireEvent.click(eraseButton())

    await waitFor(() => expect(customersApi.erase).toHaveBeenCalledWith(7, { confirmEmail: 'jamie@example.com', redactContent: true }))
    await waitFor(() => expect(onErased).toHaveBeenCalledWith(expect.objectContaining({ tickets: 2 })))
  })

  it('can keep the ticket text when the switch is turned off', async () => {
    vi.mocked(customersApi.erase).mockResolvedValue({ tickets: 1, messagesRedacted: 0, attachmentsRemoved: 0, redactedContent: false })
    renderDialog()

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText(/type jamie@example.com to confirm/i), { target: { value: 'jamie@example.com' } })
    fireEvent.click(eraseButton())

    await waitFor(() => expect(customersApi.erase).toHaveBeenCalledWith(7, { confirmEmail: 'jamie@example.com', redactContent: false }))
  })

  it('shows the server’s reason and does not report success when erasing fails', async () => {
    vi.mocked(customersApi.erase).mockRejectedValue(new ApiError('Validation failed.', 422, { confirm_email: ['The email does not match this customer.'] }))
    const { onErased } = renderDialog()

    fireEvent.change(screen.getByLabelText(/type jamie@example.com to confirm/i), { target: { value: 'jamie@example.com' } })
    fireEvent.click(eraseButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('The email does not match this customer.')
    expect(onErased).not.toHaveBeenCalled()
  })
})
