import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { SITE } from '@/config/site'
import { isPlatformAdmin } from '@/types/user'
import { publicSiteUrl } from '@/features/workspaces/workspace'
import '@/features/landing/marketing.css'

const NAV = [
  { label: 'Product', to: ROUTES.features },
  { label: 'Solutions', to: ROUTES.solutions },
  { label: 'Pricing', to: ROUTES.pricing },
  { label: 'Product tour', to: ROUTES.demo },
]

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: ROUTES.features },
      { label: 'Product tour', to: ROUTES.demo },
      { label: 'Pricing', to: ROUTES.pricing },
      { label: 'Create a workspace', to: ROUTES.register },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Solutions', to: ROUTES.solutions },
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

const PAGE_TITLES: Record<string, string> = {
  '/': 'Customer support, all together',
  '/features': 'Help desk features',
  '/solutions': 'Support for your team',
  '/demo': 'Interactive product tour',
  '/pricing': 'Plans & pricing',
  '/register': 'Create your workspace',
  '/login': 'Sign in',
  '/contact': 'Contact us',
  '/terms': 'Terms of Service',
  '/privacy': 'Privacy Policy',
  '/cookies': 'Cookie Policy',
  '/forgot-password': 'Reset your password',
}

export function PublicLayout({
  children,
  description = 'Manage customer tickets, email conversations, team collaboration, SLA targets and integrations in one SupportHub workspace.',
}: {
  children: ReactNode
  description?: string
}) {
  const { user } = useAuth()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const appHome = user ? (isPlatformAdmin(user) ? ROUTES.platformDashboard : ROUTES.dashboard) : null

  useEffect(() => {
    document.title = `${PAGE_TITLES[location.pathname] || 'Your support workspace'} | ${SITE.name}`
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' })
      else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname, location.hash, description])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  return (
    <div className="public-site">
      <a href="#main-content" className="marketing-skip-link">
        Skip to content
      </a>
      <header className="marketing-header">
        <div className="marketing-container marketing-header-inner">
          <Link to={publicSiteUrl(ROUTES.home)} className="marketing-brand" aria-label="SupportHub home">
            <span className="marketing-brand-mark">
              <Icon name="support_agent" size={23} />
            </span>
            {SITE.name}
            <span className="marketing-brand-dot">.</span>
          </Link>
          <nav aria-label="Main" className="marketing-nav">
            {NAV.map((item) => (
              <NavLink key={item.to} to={publicSiteUrl(item.to)} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                {item.label}
              </NavLink>
            ))}
          </nav>
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
          <nav id="public-mobile-nav" aria-label="Mobile main" className="marketing-mobile-nav">
            {NAV.map((item) => (
              <Link key={item.to} to={publicSiteUrl(item.to)} onClick={() => setIsMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
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
          </nav>
        )}
      </header>
      <main id="main-content" className="marketing-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="marketing-footer">
        <div className="marketing-container marketing-footer-grid">
          <div>
            <Link to={publicSiteUrl(ROUTES.home)} className="marketing-brand">
              <span className="marketing-brand-mark">
                <Icon name="support_agent" size={23} />
              </span>
              {SITE.name}
              <span className="marketing-brand-dot">.</span>
            </Link>
            <p>
              Good support starts with a team
              <br />
              that has everything it needs.
            </p>
            <span className="marketing-footer-tag">
              <span /> Built around your customers
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
