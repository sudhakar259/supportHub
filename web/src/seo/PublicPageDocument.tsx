import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers/AppProviders'
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { FeaturesPage } from '@/features/landing/pages/FeaturesPage'
import { SolutionsPage } from '@/features/landing/pages/SolutionsPage'
import { DemoPage } from '@/features/landing/pages/DemoPage'
import { FeatureDetailPage } from '@/features/landing/pages/FeatureDetailPage'
import { ResourcesPage } from '@/features/landing/pages/ResourcesPage'
import { GuidePage } from '@/features/landing/pages/GuidePage'
import { SecurityPage } from '@/features/landing/pages/SecurityPage'
import { PricingPage } from '@/features/tenants/pages/PricingPage'
import { ContactPage } from '@/features/legal/pages/ContactPage'
import { TermsPage } from '@/features/legal/pages/TermsPage'
import { PrivacyPage } from '@/features/legal/pages/PrivacyPage'
import { CookiesPage } from '@/features/legal/pages/CookiesPage'
import { PUBLIC_PAGES } from '@/seo/pages'

/** Public content only; authenticated routes are never rendered at build time. */
export function PublicPageDocument({ path }: { path: string }) {
  const pages = {
    '/': <LandingPage />,
    '/features': <FeaturesPage />,
    '/solutions': <SolutionsPage />,
    '/demo': <DemoPage />,
    '/resources': <ResourcesPage />,
    '/security': <SecurityPage />,
    '/pricing': <PricingPage />,
    '/contact': <ContactPage />,
    '/terms': <TermsPage />,
    '/privacy': <PrivacyPage />,
    '/cookies': <CookiesPage />,
  }
  const page = path.startsWith('/features/')
    ? <FeatureDetailPage slug={path.slice('/features/'.length)} />
    : path.startsWith('/resources/')
      ? <GuidePage slug={path.slice('/resources/'.length)} />
      : pages[path as keyof typeof pages]
  if (!page || !PUBLIC_PAGES[path]) throw new Error(`No public page renderer for ${path}`)

  return (
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>{page}</AppProviders>
    </MemoryRouter>
  )
}
