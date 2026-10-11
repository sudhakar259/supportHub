import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '@/components/feedback/ToastProvider'
import { BrandingCard } from '@/features/branding/BrandingCard'
import { brandingApi } from '@/features/branding/brandingApi'
import { ApiError } from '@/types/api'

const setUser = vi.fn()
const user = { tenant: { id: 1, name: 'Help Support', slug: 'help-support', workspaceUrl: '', brand: null }, permissions: ['settings.manage'] }

vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user, setUser }) }))
vi.mock('@/features/branding/brandingApi', () => ({ brandingApi: { update: vi.fn() } }))

function renderCard() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <BrandingCard />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('brand colour card', () => {
  beforeEach(() => {
    setUser.mockReset()
    vi.mocked(brandingApi.update).mockReset()
  })

  it('saves a new colour and applies it to the signed-in user straight away', async () => {
    vi.mocked(brandingApi.update).mockResolvedValue({ primaryColor: '#0f766e', sidebarColor: null, palette: { primary: '#0f766e' } })
    renderCard()

    fireEvent.change(screen.getByLabelText('Brand colour hex code'), { target: { value: '#0F766E' } })
    fireEvent.click(screen.getByRole('button', { name: /save colours/i }))

    await waitFor(() => expect(brandingApi.update).toHaveBeenCalledWith({ primaryColor: '#0f766e', sidebarColor: '#213145' }))
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(expect.objectContaining({ tenant: expect.objectContaining({ brand: { primary: '#0f766e' } }) })))
  })

  it('saves a new sidebar colour', async () => {
    vi.mocked(brandingApi.update).mockResolvedValue({ primaryColor: null, sidebarColor: '#14213d', palette: { primary: '#a33900', sidebar: '#14213d' } })
    renderCard()

    fireEvent.change(screen.getByLabelText('Sidebar colour hex code'), { target: { value: '#14213D' } })
    fireEvent.click(screen.getByRole('button', { name: /save colours/i }))

    await waitFor(() => expect(brandingApi.update).toHaveBeenCalledWith({ primaryColor: '#a33900', sidebarColor: '#14213d' }))
  })

  it('keeps save off until the colour is a full hex code', () => {
    renderCard()

    fireEvent.change(screen.getByLabelText('Brand colour hex code'), { target: { value: '#12' } })

    expect(screen.getByRole('button', { name: /save colours/i })).toBeDisabled()
    expect(screen.getAllByText(/six-digit colour/i)[0]).toBeInTheDocument()
  })

  it('shows why the server refused a colour', async () => {
    vi.mocked(brandingApi.update).mockRejectedValue(new ApiError('Validation failed.', 422, { primary_color: ['That colour is too light: white text on buttons would be hard to read. Choose a darker shade.'] }))
    renderCard()

    fireEvent.change(screen.getByLabelText('Brand colour hex code'), { target: { value: '#ffee00' } })
    fireEvent.click(screen.getByRole('button', { name: /save colours/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/too light/i)
    expect(setUser).not.toHaveBeenCalled()
  })
})
