import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { WorkflowIllustration } from '@/features/landing/components/WorkflowIllustration'
import { GUIDES } from '@/features/landing/product-content'
import { marketingTone } from '@/features/landing/palette'

export function ResourcesPage() {
  return (
    <PublicLayout>
      <section className="marketing-page-hero">
        <div className="marketing-container marketing-visual-hero-grid">
          <div className="marketing-page-hero-copy">
            <span className="marketing-eyebrow">PRACTICAL SUPPORT GUIDES</span>
            <h1>Build a helpdesk workflow<br /><span>your team can follow.</span></h1>
            <p>Learn how to organize support emails, set SLA targets and route tickets using the capabilities available in DeskZeal.</p>
            <a href="#setup-guides" className="marketing-button">Find your next step <Icon name="arrow_downward" size={18} /></a>
          </div>
          <WorkflowIllustration topic="resources" />
        </div>
      </section>
      <section id="setup-guides" className="marketing-section">
        <div className="marketing-container marketing-solutions-grid">
          {GUIDES.map((guide) => (
            <Link key={guide.slug} to={`${ROUTES.resources}/${guide.slug}`} className={`marketing-solution-card marketing-tone-${marketingTone(guide.featureSlug)}`}>
              <span className="marketing-feature-icon"><Icon name="menu_book" size={26} /></span>
              <span className="marketing-eyebrow">{guide.category}</span>
              <h2>{guide.headline}</h2>
              <p>{guide.description}</p>
              <span className="marketing-guide-length">{guide.sections.length} practical steps</span>
              <span className="marketing-card-link">Read the guide <Icon name="arrow_forward" size={18} /></span>
            </Link>
          ))}
        </div>
      </section>
      <PublicCta />
    </PublicLayout>
  )
}
