import { SITE } from '@/config/site'
import { FEATURE_PAGES, GUIDES } from '@/features/landing/product-content'

export interface PublicPage {
  title: string
  description: string
  breadcrumbs?: { name: string; path: string }[]
  article?: boolean
}

/** This allowlist also drives static rendering, the sitemap and hosting rewrites. */
export const PUBLIC_PAGES: Record<string, PublicPage> = {
  '/': { title: 'DeskZeal | Helpdesk & Customer Support Software', description: 'DeskZeal brings support tickets, email conversations, routing, SLA targets, team collaboration and reporting into one customer support workspace.' },
  '/features': { title: 'Helpdesk Software Features | DeskZeal', description: 'Explore DeskZeal ticketing, email intake, routing automation, SLA management, team permissions, support reports, API access and signed webhooks.' },
  '/solutions': { title: 'Customer Support & IT Helpdesk Solutions | DeskZeal', description: 'Organize customer support, internal IT requests and product support with DeskZeal departments, ticket routing, SLA policies and integration APIs.' },
  '/demo': { title: 'Interactive Helpdesk Demo | DeskZeal', description: 'Try DeskZeal with fictional sample tickets. Explore public replies, private notes, ticket resolution, routing and reports without creating an account.' },
  '/pricing': { title: 'Helpdesk Plans & Workspace Pricing | DeskZeal', description: 'Compare DeskZeal plans and current workspace usage limits. Explore the free Starter plan, paid-plan trials and custom Enterprise pricing.' },
  '/resources': { title: 'Helpdesk Guides: Email, SLAs & Ticket Routing | DeskZeal', description: 'Practical DeskZeal guides to email ticketing, first-response and resolution SLA targets, department routing and support team workflows.' },
  '/security': { title: 'Helpdesk Security & Workspace Access Controls | DeskZeal', description: 'Learn about DeskZeal workspace separation, roles, two-step verification, scoped API credentials, signed webhooks, audit logs and customer data tools.' },
  '/contact': { title: 'Contact DeskZeal | Sales & Customer Support', description: 'Contact DeskZeal about helpdesk plans, Enterprise requirements, your workspace or service policies. Find the published support email and account help.' },
  '/terms': { title: 'Terms of Service | DeskZeal', description: 'Read the DeskZeal Terms of Service covering accounts, subscriptions, acceptable use and operating the customer support platform.' },
  '/privacy': { title: 'Privacy Policy | DeskZeal', description: 'Read how the DeskZeal service handles account and customer support data, including customer data requests and service operator responsibilities.' },
  '/cookies': { title: 'Cookie & Browser Storage Policy | DeskZeal', description: 'Understand the browser storage used by DeskZeal for sign-in sessions, onboarding and payment checkout.' },
}

const FEATURE_TITLES: Record<string, string> = {
  ticketing: 'Helpdesk Ticketing Software',
  'email-ticketing': 'Email Ticketing Software',
  'helpdesk-automation': 'Helpdesk Routing Automation',
  'sla-management': 'Helpdesk SLA Management',
  'team-collaboration': 'Customer Support Team Collaboration',
  reports: 'Customer Support Reports',
  'api-webhooks': 'Helpdesk API & Signed Webhooks',
}

for (const feature of FEATURE_PAGES) {
  PUBLIC_PAGES[`/features/${feature.slug}`] = {
    title: `${FEATURE_TITLES[feature.slug]} | DeskZeal`, description: feature.description,
    breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Features', path: '/features' }, { name: feature.label, path: `/features/${feature.slug}` }],
  }
}
for (const guide of GUIDES) {
  PUBLIC_PAGES[`/resources/${guide.slug}`] = {
    title: `${guide.title} | DeskZeal`, description: guide.description, article: true,
    breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Resources', path: '/resources' }, { name: guide.title, path: `/resources/${guide.slug}` }],
  }
}

const PRIVATE_TITLES: Record<string, string> = {
  '/register': 'Create your workspace', '/login': 'Sign in', '/forgot-password': 'Reset your password',
  '/reset-password': 'Reset your password', '/set-password': 'Set your password', '/email-verification': 'Verify your email',
  '/two-factor': 'Two-step verification', '/account-locked': 'Account locked', '/session-expired': 'Session expired',
  '/dashboard': 'Support dashboard', '/tickets': 'Tickets', '/my-tickets': 'My tickets', '/customers': 'Customers',
  '/departments': 'Departments', '/users': 'Team members', '/roles-and-permissions': 'Roles & permissions',
  '/reports': 'Support reports', '/audit-logs': 'Audit logs', '/automation': 'Automation', '/settings': 'Settings',
  '/integrations/developer-docs': 'Developer Docs',
  '/billing': 'Billing', '/onboarding': 'Set up your workspace', '/platform/dashboard': 'Platform dashboard',
}

export interface SeoMetadata {
  title: string
  description: string
  robots: string
  canonical: string | null
  image: string
  type: 'website' | 'article'
  structuredData: Record<string, unknown> | null
}

export function getSeoMetadata(pathname: string, options: { production: boolean; hostname: string; tenant?: boolean }): SeoMetadata {
  const path = pathname.replace(/\/+$/, '') || '/'
  const page = PUBLIC_PAGES[path]
  const site = new URL(SITE.url)
  const isPublicHost = options.hostname === site.hostname || options.hostname === `www.${site.hostname}`
  const isPublic = Boolean(page && !options.tenant)
  const canonical = isPublic ? `${site.origin}${path}` : null
  const indexable = isPublic && options.production && isPublicHost
  const description = isPublic ? page.description : 'Sign in to your DeskZeal workspace to manage customer support.'
  const title = isPublic ? page.title : `${PRIVATE_TITLES[path] || ((path.startsWith('/features/') || path.startsWith('/resources/')) ? 'Page not found' : 'Workspace')} | DeskZeal`
  const graph: Record<string, unknown>[] = [
    { '@type': 'Organization', '@id': `${site.origin}/#organization`, name: SITE.name, url: `${site.origin}/`, logo: `${site.origin}/branding/deskzeal-logo.png`, ...(SITE.supportEmail ? { email: SITE.supportEmail } : {}) },
    { '@type': 'WebSite', '@id': `${site.origin}/#website`, name: SITE.name, url: `${site.origin}/`, publisher: { '@id': `${site.origin}/#organization` } },
    { '@type': page?.article ? 'Article' : 'WebPage', '@id': `${canonical}#page`, name: title, ...(page?.article ? { headline: page.title.replace(/ \| DeskZeal$/, ''), author: { '@id': `${site.origin}/#organization` }, publisher: { '@id': `${site.origin}/#organization` }, image: `${site.origin}/social-card.png` } : {}), description, url: canonical, isPartOf: { '@id': `${site.origin}/#website` } },
  ]
  if (page?.breadcrumbs) {
    graph.push({ '@type': 'BreadcrumbList', itemListElement: page.breadcrumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: `${site.origin}${item.path}` })) })
  }
  return { title, description, robots: indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow', canonical, image: `${site.origin}/social-card.png`, type: page?.article ? 'article' : 'website', structuredData: indexable ? { '@context': 'https://schema.org', '@graph': graph } : null }
}

export function serializeJsonLd(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

/** Used by the build so metadata exists in the HTTP response, before JavaScript. */
export function renderSeoHead(metadata: SeoMetadata): string {
  const meta = (name: string, value: string, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(value)}" />`
  return [
    `<title>${escapeHtml(metadata.title)}</title>`, meta('description', metadata.description), meta('robots', metadata.robots),
    metadata.canonical ? `<link rel="canonical" href="${escapeHtml(metadata.canonical)}" />` : '',
    meta('og:site_name', SITE.name, true), meta('og:title', metadata.title, true), meta('og:description', metadata.description, true),
    meta('og:type', metadata.type, true), metadata.canonical ? meta('og:url', metadata.canonical, true) : '',
    meta('og:image', metadata.image, true), meta('og:image:width', '1200', true), meta('og:image:height', '630', true), meta('og:image:alt', 'DeskZeal helpdesk and customer support software', true),
    meta('twitter:card', 'summary_large_image'), meta('twitter:title', metadata.title), meta('twitter:description', metadata.description), meta('twitter:image', metadata.image),
    metadata.structuredData ? `<script id="seo-jsonld" type="application/ld+json">${serializeJsonLd(metadata.structuredData)}</script>` : '',
  ].filter(Boolean).join('\n    ')
}
