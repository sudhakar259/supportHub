import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { SITE } from '@/config/site'
import { cn } from '@/utils/cn'
import { isPlatformAdmin } from '@/types/user'

const NAV = [
  { label: 'Features', to: `${ROUTES.home}#features` },
  { label: 'How it works', to: `${ROUTES.home}#how-it-works` },
  { label: 'Pricing', to: ROUTES.pricing },
]

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: `${ROUTES.home}#features` },
      { label: 'Pricing', to: ROUTES.pricing },
      { label: 'Start free trial', to: ROUTES.register },
      { label: 'Sign in', to: ROUTES.login },
    ],
  },
  {
    title: 'Company',
    links: [{ label: 'Contact', to: ROUTES.contact }],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', to: ROUTES.terms },
      { label: 'Privacy Policy', to: ROUTES.privacy },
      { label: 'Cookie Policy', to: ROUTES.cookies },
    ],
  },
]

/** Chrome for the marketing and legal pages: sticky header with navigation, full footer. */
export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const appHome = user ? (isPlatformAdmin(user) ? ROUTES.platformDashboard : ROUTES.dashboard) : null

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <header className="sticky top-0 z-50 bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.05)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-margin-mobile sm:px-margin">
          <Link to={ROUTES.home} className="flex items-center gap-space-md">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-on-primary">
              <Icon name="support_agent" size={18} />
            </span>
            <span className="text-headline-sm tracking-tight">{SITE.name}</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-space-sm md:flex">
            {NAV.map((item) =>
              item.to.includes('#') ? (
                <a key={item.label} href={item.to} className="rounded px-space-md py-space-xs text-title-sm text-on-surface-variant transition-colors hover:text-on-surface">
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded px-space-md py-space-xs text-title-sm transition-colors',
                      isActive ? 'bg-surface-container font-semibold text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-space-md md:flex">
            {appHome ? (
              <Link to={appHome} className="inline-flex h-9 items-center rounded-lg bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to={ROUTES.login} className="px-space-md text-title-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface">
                  Sign in
                </Link>
                <Link to={ROUTES.register} className="inline-flex h-9 items-center rounded-lg bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container">
                  Start free trial
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface md:hidden"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <Icon name={isMenuOpen ? 'close' : 'menu'} size={24} />
          </button>
        </div>

        {isMenuOpen && (
          <div className="flex flex-col gap-space-xs bg-surface px-margin-mobile pb-space-md md:hidden">
            {NAV.map((item) => (
              <a key={item.label} href={item.to} onClick={() => setIsMenuOpen(false)} className="rounded px-space-md py-space-sm text-title-sm text-on-surface">
                {item.label}
              </a>
            ))}
            {appHome ? (
              <Link to={appHome} className="rounded px-space-md py-space-sm text-title-sm font-semibold text-primary">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to={ROUTES.login} className="rounded px-space-md py-space-sm text-title-sm text-on-surface">
                  Sign in
                </Link>
                <Link to={ROUTES.register} className="rounded px-space-md py-space-sm text-title-sm font-semibold text-primary">
                  Start free trial
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="bg-surface-container-low">
        <div className="mx-auto grid w-full max-w-6xl gap-space-xl px-margin-mobile py-space-xl sm:px-margin md:grid-cols-4">
          <div className="flex flex-col gap-space-sm">
            <span className="flex items-center gap-space-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-on-primary">
                <Icon name="support_agent" size={16} />
              </span>
              <span className="text-headline-sm tracking-tight">{SITE.name}</span>
            </span>
            <p className="text-body-sm text-on-surface-variant">A help desk for teams that support customers across more than one organization.</p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-space-sm">
              <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">{column.title}</span>
              {column.links.map((link) =>
                link.to.includes('#') ? (
                  <a key={link.label} href={link.to} className="text-body-sm text-on-surface hover:text-primary">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.label} to={link.to} className="text-body-sm text-on-surface hover:text-primary">
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          ))}
        </div>
        <div className="border-t border-outline-variant/30">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-space-xs px-margin-mobile py-space-md text-body-sm text-on-surface-variant sm:flex-row sm:justify-between sm:px-margin">
            <span>
              © {new Date().getFullYear()} {SITE.legalEntity}. All rights reserved.
            </span>
            {SITE.supportEmail && (
              <a href={`mailto:${SITE.supportEmail}`} className="hover:text-primary">
                {SITE.supportEmail}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
