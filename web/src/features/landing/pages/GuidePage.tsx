import { Link, useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { GUIDES } from '@/features/landing/product-content'
import { PublicNotFoundPage } from '@/features/landing/pages/PublicNotFoundPage'

export function GuidePage({ slug }: { slug?: string }) {
  const params = useParams()
  const guide = GUIDES.find((item) => item.slug === (slug || params.slug))
  if (!guide) return <PublicNotFoundPage />

  return (
    <PublicLayout>
      <section className="marketing-page-hero marketing-editorial-hero">
        <div className="marketing-container">
          <nav aria-label="Breadcrumb" className="marketing-breadcrumb">
            <Link to={ROUTES.home}>Home</Link><span>/</span>
            <Link to={ROUTES.resources}>Resources</Link><span>/</span>
            <span>{guide.category}</span>
          </nav>
          <span className="marketing-eyebrow">{guide.category} / DESKNU GUIDE</span>
          <h1>{guide.title}</h1>
          <p>{guide.intro}</p>
        </div>
      </section>
      <article className="marketing-container marketing-guide-body marketing-editorial-body">
        {guide.sections.map((section) => (
          <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>
        ))}
        <div className="marketing-guide-next">
          <h2>Explore the tools behind this workflow.</h2>
          <Link to={`${ROUTES.features}/${guide.featureSlug}`} className="marketing-text-link">
            See the DeskNu feature <Icon name="arrow_forward" size={18} />
          </Link>
          <Link to={ROUTES.resources} className="marketing-text-link">Browse all guides</Link>
        </div>
      </article>
      <PublicCta />
    </PublicLayout>
  )
}
