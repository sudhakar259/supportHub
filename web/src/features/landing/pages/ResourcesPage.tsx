import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { GUIDES } from '@/features/landing/product-content'

export function ResourcesPage() {
  return (
    <PublicLayout>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <span className="marketing-eyebrow">PRACTICAL SUPPORT GUIDES</span>
          <h1>Build a helpdesk workflow<br /><span>your team can follow.</span></h1>
          <p>Learn how to organize support emails, set SLA targets and route tickets using the capabilities available in DeskNu.</p>
        </div>
      </section>
      <section className="marketing-section">
        <div className="marketing-container marketing-solutions-grid">
          {GUIDES.map((guide) => (
            <Link key={guide.slug} to={`${ROUTES.resources}/${guide.slug}`} className="marketing-solution-card">
              <span className="marketing-eyebrow">{guide.category}</span>
              <h2>{guide.title}</h2>
              <p>{guide.description}</p>
              <span className="marketing-card-link">Read the guide <Icon name="arrow_forward" size={18} /></span>
            </Link>
          ))}
        </div>
      </section>
      <PublicCta />
    </PublicLayout>
  )
}
