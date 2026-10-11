import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { SITE } from '@/config/site'

export interface LegalSection {
  heading: string
  body: ReactNode
}

/** Shared frame for the Terms, Privacy and Cookie pages: title, last-updated date, numbered sections. */
export function LegalDocument({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-3xl px-margin-mobile py-space-xl sm:px-margin lg:py-16">
        <nav aria-label="Legal documents" className="mb-space-lg flex flex-wrap gap-space-md text-body-sm">
          <Link to={ROUTES.terms} className="text-on-surface-variant hover:text-primary">
            Terms of Service
          </Link>
          <Link to={ROUTES.privacy} className="text-on-surface-variant hover:text-primary">
            Privacy Policy
          </Link>
          <Link to={ROUTES.cookies} className="text-on-surface-variant hover:text-primary">
            Cookie Policy
          </Link>
        </nav>
        <h1 className="text-display-lg tracking-tight text-on-surface">{title}</h1>
        <p className="mt-space-xs text-body-sm text-on-surface-variant">Last updated {SITE.legalLastUpdated}</p>
        <p className="mt-space-lg text-body-lg text-on-surface-variant">{intro}</p>
        <div className="mt-space-xl flex flex-col gap-space-xl">
          {sections.map((section, index) => (
            <section key={section.heading} aria-labelledby={`legal-${index}`}>
              <h2 id={`legal-${index}`} className="text-headline-md text-on-surface">
                {index + 1}. {section.heading}
              </h2>
              <div className="mt-space-sm flex flex-col gap-space-sm text-body-md text-on-surface-variant [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-on-surface">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
