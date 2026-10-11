import { Link, useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { FEATURE_PAGES } from '@/features/landing/product-content'
import { PublicNotFoundPage } from '@/features/landing/pages/PublicNotFoundPage'

export function FeatureDetailPage({ slug }: { slug?: string }) {
  const params = useParams()
  const feature = FEATURE_PAGES.find((item) => item.slug === (slug || params.slug))
  if (!feature) return <PublicNotFoundPage />
  const relatedFeatures = FEATURE_PAGES.filter((item) => feature.related.includes(item.slug))

  return (
    <PublicLayout>
      <section className="marketing-page-hero marketing-editorial-hero">
        <div className="marketing-container">
          <nav aria-label="Breadcrumb" className="marketing-breadcrumb">
            <Link to={ROUTES.home}>Home</Link><span>/</span>
            <Link to={ROUTES.features}>Features</Link><span>/</span>
            <span>{feature.label}</span>
          </nav>
          <span className="marketing-eyebrow"><Icon name={feature.icon} size={20} /> DESKNU / {feature.label}</span>
          <h1>{feature.title}</h1>
          <p>{feature.intro}</p>
          <div className="marketing-actions">
            <Link to={ROUTES.register} className="marketing-button">
              Create your workspace <Icon name="arrow_forward" size={18} />
            </Link>
            <Link to={ROUTES.demo} className="marketing-text-link">
              Explore the demo <Icon name="play_circle" size={19} />
            </Link>
          </div>
        </div>
      </section>
      <section className="marketing-section">
        <div className="marketing-container marketing-editorial-grid">
          <div className="marketing-editorial-body">
            {feature.sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
                {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
              </section>
            ))}
          </div>
          <aside className="marketing-editorial-aside">
            <span className="marketing-eyebrow">THE NEXT STEP</span>
            <h2>See your support workflow in one place.</h2>
            <p>Explore fictional tickets in the product tour, then configure your own team, policies and integrations.</p>
            <Link to={ROUTES.demo} className="marketing-button">Take the tour <Icon name="arrow_forward" size={18} /></Link>
            <Link to={ROUTES.pricing} className="marketing-text-link">Compare plans</Link>
            <Link to={ROUTES.resources} className="marketing-text-link">Read the setup guides</Link>
          </aside>
        </div>
      </section>
      <section className="marketing-section marketing-workflow-section">
        <div className="marketing-container">
          <div className="marketing-section-heading"><h2>Keep the workflow connected.</h2></div>
          <div className="marketing-solutions-grid">
            {relatedFeatures.map((item) => (
              <Link key={item.slug} to={`${ROUTES.features}/${item.slug}`} className="marketing-solution-card">
                <Icon name={item.icon} size={26} />
                <h3>{item.label}</h3>
                <p>{item.intro}</p>
                <span className="marketing-card-link">
                  Explore {item.label.toLowerCase()} <Icon name="arrow_forward" size={17} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <PublicCta />
    </PublicLayout>
  )
}
