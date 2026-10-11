import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Icon } from '@/components/ui/Icon'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { PublicNavigation } from '@/components/navigation/PublicNavigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { SITE } from '@/config/site'
import { isPlatformAdmin } from '@/types/user'
import { publicSiteUrl } from '@/features/workspaces/workspace'
import '@/features/landing/marketing.css'

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: ROUTES.features },
      { label: 'Product tour', to: ROUTES.demo },
      { label: 'Pricing', to: ROUTES.pricing },
      { label: 'Security & workspace controls', to: ROUTES.security },
      { label: 'Create a workspace', to: ROUTES.register },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Solutions', to: ROUTES.solutions },
      { label: 'Helpdesk guides', to: ROUTES.resources },
      { label: 'How it works', to: `${ROUTES.home}#how-it-works` },
      { label: 'Contact', to: ROUTES.contact },
      { label: 'Sign in', to: ROUTES.login },
    ],
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

export function PublicLayout({
  children,
}: {
  children: ReactNode
}) {
  const { user } = useAuth()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuToggle = useRef<HTMLButtonElement>(null)
  const appHome = user ? (isPlatformAdmin(user) ? ROUTES.platformDashboard : ROUTES.dashboard) : null

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' })
      else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname, location.hash])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false)
        menuToggle.current?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isMenuOpen])

  return (
    <div className="public-site">
      <a href="#main-content" className="marketing-skip-link">
        Skip to content
      </a>
      <header className="marketing-header">
        <div className="marketing-container marketing-header-inner">
          <Link to={publicSiteUrl(ROUTES.home)} className="marketing-brand" aria-label="DeskZeal home">
            <BrandLogo />
          </Link>
          <PublicNavigation />
          <div className="marketing-header-actions">
            {appHome ? (
              <Link to={appHome} className="marketing-button marketing-button-small">
                Open dashboard <Icon name="arrow_forward" size={17} />
              </Link>
            ) : (
              <>
                <Link to={ROUTES.login} className="marketing-signin">
                  Sign in
                </Link>
                <Link to={publicSiteUrl(ROUTES.register)} className="marketing-button marketing-button-small">
                  Start free trial <Icon name="arrow_forward" size={17} />
                </Link>
              </>
            )}
          </div>
          <button
            ref={menuToggle}
            type="button"
            className="marketing-menu-toggle"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="public-mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <Icon name={isMenuOpen ? 'close' : 'menu'} size={25} />
          </button>
        </div>
        {isMenuOpen && (
          <PublicNavigation mobile onNavigate={() => setIsMenuOpen(false)}>
            {appHome ? (
              <Link to={appHome} onClick={() => setIsMenuOpen(false)}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to={ROUTES.login} onClick={() => setIsMenuOpen(false)}>
                  Sign in
                </Link>
                <Link to={publicSiteUrl(ROUTES.register)} className="marketing-button" onClick={() => setIsMenuOpen(false)}>
                  Start free trial
                </Link>
              </>
            )}
          </PublicNavigation>
        )}
      </header>
      <main id="main-content" className="marketing-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="marketing-footer">
        <div className="marketing-container marketing-footer-grid">
          <div>
            <Link to={publicSiteUrl(ROUTES.home)} className="marketing-brand" aria-label="DeskZeal home">
              <BrandLogo tone="dark" size={28} />
            </Link>
            <p>
              Good support starts with a team
              <br />
              that has everything it needs.
            </p>
            <span className="marketing-footer-tag">
              <span aria-hidden="true" /> Built around your customers
            </span>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2>{column.title}</h2>
              {column.links.map((link) => (
                <Link key={link.label} to={link.to === ROUTES.login ? link.to : publicSiteUrl(link.to)}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="marketing-container marketing-footer-bottom">
          <span>
            © {new Date().getFullYear()} {SITE.legalEntity}. All rights reserved.
          </span>
          {SITE.supportEmail ? (
            <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
          ) : (
            <span>Tickets. Teams. Customers. Together.</span>
          )}
        </div>
      </footer>
    </div>
  )
}
