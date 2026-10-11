import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'

export function PublicNotFoundPage() {
  return (
    <PublicLayout>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <span className="marketing-eyebrow">404</span>
          <h1>Page not found.</h1>
          <p>Explore DeskZeal’s helpdesk features or return to the homepage.</p>
          <div className="marketing-actions">
            <Link to={ROUTES.home} className="marketing-button">Go to homepage</Link>
            <Link to={ROUTES.features} className="marketing-text-link">Explore features</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
