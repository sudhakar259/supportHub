import { Link, useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { WorkflowIllustration } from '@/features/landing/components/WorkflowIllustration'
import { GUIDES } from '@/features/landing/product-content'
import { PublicNotFoundPage } from '@/features/landing/pages/PublicNotFoundPage'
import { marketingTone } from '@/features/landing/palette'

export function GuidePage({ slug }: { slug?: string }) {
  const params = useParams()
  const guide = GUIDES.find((item) => item.slug === (slug || params.slug))
  if (!guide) return <PublicNotFoundPage />

  return (
    <PublicLayout>
      <section className={`marketing-page-hero marketing-editorial-hero marketing-tone-${marketingTone(guide.featureSlug)}`}>
        <div className="marketing-container marketing-visual-hero-grid">
          <div className="marketing-page-hero-copy">
            <nav aria-label="Breadcrumb" className="marketing-breadcrumb">
              <Link to={ROUTES.home}>Home</Link><span>/</span>
              <Link to={ROUTES.resources}>Resources</Link><span>/</span>
              <span>{guide.category}</span>
            </nav>
            <span className="marketing-eyebrow"><span className="marketing-topic-icon"><Icon name="menu_book" size={20} /></span>{guide.category} / DESKZEAL GUIDE</span>
            <h1>{guide.headline}</h1>
            <p>{guide.intro}</p>
            <a href="#guide-step-1" className="marketing-button">Start the guide <Icon name="arrow_downward" size={18} /></a>
            <span className="marketing-guide-length">{guide.sections.length} practical steps</span>
          </div>
          <WorkflowIllustration topic={guide.featureSlug} />
        </div>
      </section>
      <div className="marketing-container marketing-guide-layout">
        <nav className={`marketing-guide-contents marketing-tone-${marketingTone(guide.featureSlug)}`} aria-label="Guide steps">
          <span className="marketing-eyebrow">YOUR SETUP CHECKLIST</span>
          <ol>{guide.sections.map((section, index) => <li key={section.title}><a href={`#guide-step-${index + 1}`}><span>0{index + 1}</span>{section.title.replace(/^\d+\.\s*/, '')}<Icon name="arrow_forward" size={16} /></a></li>)}</ol>
        </nav>
        <article className="marketing-guide-steps">
          {guide.sections.map((section, index) => (
            <section id={`guide-step-${index + 1}`} className={`marketing-guide-step marketing-tone-${marketingTone(guide.featureSlug)}`} key={section.title}>
              <span className="marketing-guide-step-number">0{index + 1}</span>
              <div><h2>{section.title.replace(/^\d+\.\s*/, '')}</h2><p>{section.body}</p></div>
            </section>
          ))}
          <div className={`marketing-guide-next marketing-tone-${marketingTone(guide.featureSlug)}`}>
          <h2>Explore the tools behind this workflow.</h2>
          <Link to={`${ROUTES.features}/${guide.featureSlug}`} className="marketing-text-link">
            See the DeskZeal feature <Icon name="arrow_forward" size={18} />
          </Link>
          <Link to={ROUTES.resources} className="marketing-text-link">Browse all guides</Link>
          </div>
        </article>
      </div>
      <PublicCta />
    </PublicLayout>
  )
}
