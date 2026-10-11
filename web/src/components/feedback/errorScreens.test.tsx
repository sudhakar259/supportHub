import { render, screen } from '@testing-library/react'
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { UnknownRoute } from '@/app/router/UnknownRoute'
import { AppErrorBoundary } from '@/components/feedback/AppErrorBoundary'
import { RouteErrorPage } from '@/components/feedback/RouteErrorPage'
import { AuthProvider } from '@/features/auth/hooks/useAuth'

let authState: { user: unknown; isPlatformAdmin: boolean; isBootstrapping: boolean } = { user: null, isPlatformAdmin: false, isBootstrapping: false }
vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div> }))
vi.mock('@/components/layout/PlatformShell', () => ({ PlatformShell: ({ children }: { children: React.ReactNode }) => <div data-testid="platform-shell">{children}</div> }))
vi.mock('@/features/auth/hooks/useAuth', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/auth/hooks/useAuth')>()
  return { ...original, useAuth: () => ({ ...original, ...authState }) }
})

function Boom(): never {
  throw new Error('kaboom with jamie@example.com')
}

function renderRoutes(initialPath: string, routes: Parameters<typeof createMemoryRouter>[0]) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  return render(<RouterProvider router={router} />)
}

describe('error and 404 screens', () => {
  beforeEach(() => {
    authState = { user: null, isPlatformAdmin: false, isBootstrapping: false }
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows a calm message with a reference when a page crashes, not React Router\'s developer screen', () => {
    renderRoutes('/', [{ path: '/', element: <Boom />, errorElement: <RouteErrorPage /> }])

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByText(/tell support this reference/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
    expect(screen.queryByText(/Unexpected Application Error/i)).not.toBeInTheDocument()
  })

  it('never shows the error\'s own text, which can contain an email, to a visitor in production', () => {
    vi.stubEnv('DEV', false)
    try {
      renderRoutes('/', [{ path: '/', element: <Boom />, errorElement: <RouteErrorPage /> }])

      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
      expect(screen.getByRole('alert').textContent).not.toMatch(/jamie@example\.com|kaboom/)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('shows the technical detail while developing, to help whoever is building', () => {
    vi.stubEnv('DEV', true)
    try {
      renderRoutes('/', [{ path: '/', element: <Boom />, errorElement: <RouteErrorPage /> }])

      expect(screen.getByRole('alert').textContent).toMatch(/kaboom/)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('asks for a refresh when a page file could not be loaded (an old tab after a deploy)', () => {
    function StaleChunk(): never {
      throw new Error('Failed to fetch dynamically imported module: https://x/assets/Page-abc.js')
    }
    renderRoutes('/', [{ path: '/', element: <StaleChunk />, errorElement: <RouteErrorPage /> }])

    expect(screen.getByRole('alert')).toHaveTextContent('This page needs a refresh')
  })

  it('shows the 404 page for an address that matches nothing', () => {
    render(
      <AuthProvider>
        <RouterProviderFor path="/no-such-page" />
      </AuthProvider>,
    )

    expect(screen.getByRole('heading', { name: /we can.t find that page/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to the start page/i })).toHaveAttribute('href', '/')
  })

  it('catches a crash anywhere in the app with the last-resort boundary', () => {
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByText(/tell support this reference/i)).toBeInTheDocument()
  })

  it('renders children normally when nothing is wrong', () => {
    render(
      <AppErrorBoundary>
        <p>all fine</p>
      </AppErrorBoundary>,
    )

    expect(screen.getByText('all fine')).toBeInTheDocument()
  })
})

function RouterProviderFor({ path }: { path: string }) {
  const router = createMemoryRouter([{ path: '/', element: <p>home</p>, errorElement: <RouteErrorPage /> }], { initialEntries: [path] })
  return <RouterProvider router={router} />
}

describe('unknown addresses', () => {
  const renderUnknown = () =>
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/typo']}>
          <UnknownRoute />
        </MemoryRouter>
      </AuthProvider>,
    )

  it('shows a public 404 (not the sign-in page) to someone who is not signed in', () => {
    renderUnknown()

    expect(screen.getByRole('heading', { name: /we can.t find that page/i })).toBeInTheDocument()
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument()
  })

  it('keeps the app\'s sidebar and top bar around the 404 for a signed-in team member', () => {
    authState = { user: { id: 1 }, isPlatformAdmin: false, isBootstrapping: false }
    renderUnknown()

    expect(screen.getByTestId('app-shell')).toHaveTextContent(/find that page/i)
    expect(screen.getByRole('link', { name: /go to the dashboard/i })).toHaveAttribute('href', '/dashboard')
  })

  it('uses the platform console for a platform administrator', () => {
    authState = { user: { id: 1 }, isPlatformAdmin: true, isBootstrapping: false }
    renderUnknown()

    expect(screen.getByTestId('platform-shell')).toHaveTextContent(/find that page/i)
    expect(screen.getByRole('link', { name: /go to the dashboard/i })).toHaveAttribute('href', '/platform/dashboard')
  })

  it('waits while the session is being restored instead of flashing a 404', () => {
    authState = { user: null, isPlatformAdmin: false, isBootstrapping: true }
    renderUnknown()

    expect(screen.queryByRole('heading', { name: /find that page/i })).not.toBeInTheDocument()
  })
})
