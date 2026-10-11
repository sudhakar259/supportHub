import { useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Icon } from '@/components/ui/Icon'
import { SOLUTIONS } from '@/features/landing/content'
import { FEATURE_PAGES, GUIDES } from '@/features/landing/product-content'
import { marketingTone } from '@/features/landing/palette'
import type { MarketingTone } from '@/features/landing/palette'
import { publicSiteUrl } from '@/features/workspaces/workspace'

interface NavigationItem {
  label: string
  to: string
  icon: string
  iconTone?: MarketingTone
  description?: string
}

interface NavigationGroup {
  label: string
  to: string
  overview: string
  items: NavigationItem[]
  wide?: boolean
}

const GROUPS: NavigationGroup[] = [
  {
    label: 'Product', to: ROUTES.features, overview: 'Explore all features', wide: true,
    items: FEATURE_PAGES.map(feature => ({ label: feature.label, to: `${ROUTES.features}/${feature.slug}`, icon: feature.icon, iconTone: marketingTone(feature.slug) })),
  },
  {
    label: 'Solutions', to: ROUTES.solutions, overview: 'Explore all solutions',
    items: SOLUTIONS.map((solution, index) => ({ label: solution.title, to: `${ROUTES.solutions}#solution-${index}`, icon: solution.icon, description: solution.audience, iconTone: marketingTone(solution.icon) })),
  },
  {
    label: 'Resources', to: ROUTES.resources, overview: 'Explore all guides',
    items: [
      ...GUIDES.map(guide => ({ label: guide.category, to: `${ROUTES.resources}/${guide.slug}`, icon: 'menu_book', description: guide.title, iconTone: marketingTone(guide.featureSlug) })),
      { label: 'Security & access', to: ROUTES.security, icon: 'shield', description: 'Understand workspace and data controls', iconTone: 'navy' },
      { label: 'Contact us', to: ROUTES.contact, icon: 'mail', description: 'Plans, workspace help and service details', iconTone: 'primary' },
    ],
  },
]

function NavigationDisclosure({ group, mobile, open, onOpen, onClose, onNavigate }: {
  group: NavigationGroup
  mobile: boolean
  open: boolean
  onOpen: () => void
  onClose: () => void
  onNavigate?: () => void
}) {
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const location = useLocation()
  const active = location.pathname === group.to || location.pathname.startsWith(`${group.to}/`)
    || group.items.some(item => item.to.split('#')[0] === location.pathname)

  useEffect(() => {
    if (!open || mobile) return
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) onClose()
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open, mobile, onClose])

  function close() {
    onClose()
    onNavigate?.()
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    // Mobile groups are accordions. Collapsing on pointer-induced blur moves the next
    // navigation target between pointerdown and click, preventing the visitor's tap.
    if (!mobile && !event.currentTarget.contains(event.relatedTarget)) onClose()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      trigger.current?.focus()
    } else if (event.target === trigger.current && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      onOpen()
      window.requestAnimationFrame(() => {
        const links = wrapper.current?.querySelectorAll<HTMLAnchorElement>('.marketing-nav-panel a')
        if (links?.length) links[event.key === 'ArrowUp' ? links.length - 1 : 0].focus()
      })
    }
  }

  return (
    <div
      ref={wrapper}
      className={`marketing-nav-disclosure${group.wide ? ' marketing-nav-disclosure-wide' : ''}${group.label === 'Resources' ? ' marketing-nav-disclosure-end' : ''}`}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <button
        ref={trigger}
        type="button"
        className={`marketing-nav-trigger${active ? ' is-active' : ''}`}
        aria-expanded={open}
        aria-controls={`${id}-links`}
        onClick={open ? onClose : onOpen}
      >
        {group.label}<Icon name={open ? 'expand_less' : 'expand_more'} size={17} />
      </button>
      <div id={`${id}-links`} className="marketing-nav-panel" hidden={!open}>
        <div className="marketing-nav-panel-links">
          {group.items.map(item => (
            <Link key={item.to} to={publicSiteUrl(item.to)} className="marketing-nav-panel-link" onClick={close}>
              <span className={`marketing-nav-panel-icon marketing-tone-${item.iconTone ?? 'primary'}`} aria-hidden="true"><Icon name={item.icon} size={21} /></span>
              <span><strong>{item.label}</strong>{item.description && <> <small>{item.description}</small></>}</span>
            </Link>
          ))}
        </div>
        <Link to={publicSiteUrl(group.to)} className="marketing-nav-overview" onClick={close}>
          {group.overview}<Icon name="arrow_forward" size={17} />
        </Link>
      </div>
    </div>
  )
}

/** Disclosure navigation keeps normal links and keyboard tab order for a public website. */
export function PublicNavigation({ mobile = false, onNavigate, children }: { mobile?: boolean; onNavigate?: () => void; children?: ReactNode }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const disclosure = (group: NavigationGroup) => (
    <NavigationDisclosure
      group={group}
      mobile={mobile}
      open={openGroup === group.label}
      onOpen={() => setOpenGroup(group.label)}
      onClose={() => setOpenGroup(null)}
      onNavigate={onNavigate}
    />
  )
  const plainLink = (label: string, to: string) => (
    <NavLink to={publicSiteUrl(to)} className={({ isActive }) => isActive ? 'is-active' : ''} onClick={onNavigate}>{label}</NavLink>
  )
  return (
    <nav id={mobile ? 'public-mobile-nav' : undefined} aria-label={mobile ? 'Mobile main' : 'Main'} className={mobile ? 'marketing-mobile-nav' : 'marketing-nav'}>
      {disclosure(GROUPS[0])}
      {disclosure(GROUPS[1])}
      {plainLink('Pricing', ROUTES.pricing)}
      {disclosure(GROUPS[2])}
      {plainLink('Product tour', ROUTES.demo)}
      {children}
    </nav>
  )
}
