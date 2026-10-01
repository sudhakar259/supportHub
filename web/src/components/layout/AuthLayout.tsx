import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { Icon } from '@/components/ui/Icon'
import { ROUTES } from '@/app/router/routes'
import { cn } from '@/utils/cn'

const NAV_LINKS = [
  { label: 'Sign In', path: ROUTES.login },
  { label: 'Recovery', path: ROUTES.forgotPassword },
]

const COMPLIANCE_BADGES = ['SOC 2 Type II', 'ISO 27001', 'GDPR Ready', 'HIPAA Compliant']

/**
 * Shared chrome for every unauthenticated screen (login, recovery, MFA, lockouts, …):
 * fixed header with brand + status pill, centered content slot, compliance footer.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col justify-between bg-surface text-on-surface">
      <header className="fixed top-0 left-0 z-50 w-full bg-surface/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between px-gutter-lg">
          <div className="flex items-center gap-space-md">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-on-primary">
              <Icon name="support_agent" size={18} />
            </div>
            <span className="text-headline-sm tracking-tight">SupportHub</span>
            <div className="mx-space-xs h-4 w-px bg-outline-variant/40" />
            <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">Enterprise Portal</span>
          </div>
          <div className="flex items-center gap-space-lg">
            <nav className="hidden items-center gap-space-sm sm:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'rounded px-space-md py-space-xs text-title-sm transition-colors',
                    location.pathname === link.path
                      ? 'bg-surface-container font-semibold text-on-surface'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="inline-flex items-center gap-space-xs rounded-full bg-surface-container-low px-space-sm py-space-xs text-label-sm text-tertiary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-tertiary-container" />
              <span>Systems Operational</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col items-center justify-center bg-surface px-margin-mobile py-space-xl pt-16 sm:px-margin">
        {children}
      </main>

      <footer className="w-full bg-surface-container-low py-space-lg">
        <div className="flex w-full flex-col items-center justify-between gap-space-md px-gutter-lg text-body-sm text-on-surface-variant md:flex-row">
          <div className="flex flex-wrap items-center gap-space-md">
            <span className="text-label-sm font-semibold uppercase text-secondary">Certified:</span>
            {COMPLIANCE_BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded bg-surface-container-lowest px-space-sm py-0.5 text-code-sm text-on-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-space-lg">
            <a className="text-label-md transition-colors hover:text-on-surface" href="#">
              Terms of Service
            </a>
            <a className="text-label-md transition-colors hover:text-on-surface" href="#">
              Privacy Policy
            </a>
            <span className="text-outline-variant">•</span>
            <span>© {new Date().getFullYear()} SupportHub Global, Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
