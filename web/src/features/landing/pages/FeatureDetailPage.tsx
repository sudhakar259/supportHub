import { Link, useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { WorkflowIllustration } from '@/features/landing/components/WorkflowIllustration'
import { FEATURE_PAGES } from '@/features/landing/product-content'
import { PublicNotFoundPage } from '@/features/landing/pages/PublicNotFoundPage'
import { marketingTone } from '@/features/landing/palette'

export function FeatureDetailPage({ slug }: { slug?: string }) {
  const params = useParams()
  const feature = FEATURE_PAGES.find((item) => item.slug === (slug || params.slug))
  if (!feature) return <PublicNotFoundPage />
  const relatedFeatures = FEATURE_PAGES.filter((item) => feature.related.includes(item.slug))
  const [headline, ...headlineRest] = feature.title.split('. ')

  return (
    <PublicLayout>
      <section className={`marketing-page-hero marketing-editorial-hero marketing-tone-${marketingTone(feature.slug)}`}>
        <div className="marketing-container marketing-visual-hero-grid">
          <div className="marketing-page-hero-copy">
            <nav aria-label="Breadcrumb" className="marketing-breadcrumb">
              <Link to={ROUTES.home}>Home</Link><span>/</span>
              <Link to={ROUTES.features}>Features</Link><span>/</span>
              <span>{feature.label}</span>
            </nav>
            <span className="marketing-eyebrow"><span className="marketing-topic-icon"><Icon name={feature.icon} size={20} /></span> DESKZEAL / {feature.label}</span>
            <h1>{headline}.<br /><span>{headlineRest.join('. ')}</span></h1>
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
          <WorkflowIllustration topic={feature.slug} />
        </div>
      </section>
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-section-heading">
            <div><span className="marketing-eyebrow">HOW IT HELPS</span><h2>Less friction. More clarity.</h2></div>
          </div>
          <div className="marketing-explainer-grid">
            {feature.sections.map((section, index) => (
              <article className={`marketing-explainer-card marketing-tone-${marketingTone(feature.slug)}`} key={section.title}>
                <span className="marketing-explainer-number">0{index + 1}</span>
                <h3>{section.title}</h3>
                {section.bullets ? <>
                  <ul>{section.bullets.map((bullet) => <li key={bullet}><Icon name="check_circle" size={18} />{bullet}</li>)}</ul>
                  <details className="marketing-feature-notes"><summary>How it works <Icon name="expand_more" size={18} /></summary><p>{section.body}</p></details>
                </> : <p>{section.body}</p>}
              </article>
            ))}
          </div>
          <div className="marketing-next-step-strip">
            <div><span className="marketing-eyebrow">SEE IT IN ACTION</span><h3>Try it with sample tickets.</h3><p>Explore the demo, then set up your own team.</p></div>
            <div className="marketing-actions"><Link to={ROUTES.demo} className="marketing-button">Take the tour <Icon name="arrow_forward" size={18} /></Link><Link to={ROUTES.resources} className="marketing-text-link">Setup guides <Icon name="menu_book" size={18} /></Link></div>
          </div>
        </div>
      </section>
      <section className="marketing-section marketing-workflow-section">
        <div className="marketing-container">
          <div className="marketing-section-heading"><h2>Keep the workflow connected.</h2></div>
          <div className="marketing-solutions-grid">
            {relatedFeatures.map((item) => (
              <Link key={item.slug} to={`${ROUTES.features}/${item.slug}`} className={`marketing-solution-card marketing-tone-${marketingTone(item.slug)}`}>
                <span className="marketing-feature-icon"><Icon name={item.icon} size={26} /></span>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
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
