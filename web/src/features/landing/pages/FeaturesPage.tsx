import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { PRODUCT_FEATURES } from '@/features/landing/content'

export function FeaturesPage() {
  return (
    <PublicLayout>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <span className="marketing-eyebrow">THE DESKNU TOOLKIT</span>
          <h1>
            Helpdesk features.
            <br />
            <span>Connected in one workspace.</span>
          </h1>
          <p>Manage support tickets, email intake, routing rules, SLA targets, team access and reporting with DeskNu.</p>
          <div className="marketing-actions">
            <Link to={ROUTES.demo} className="marketing-button">
              Try the product tour <Icon name="arrow_forward" size={19} />
            </Link>
            <Link to={ROUTES.pricing} className="marketing-text-link">
              Compare plans <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
        </div>
      </section>
      <nav className="marketing-feature-index" aria-label="Feature categories">
        <div className="marketing-container">
          {PRODUCT_FEATURES.map((feature) => (
            <a href={`#${feature.id}`} key={feature.id}>
              <Icon name={feature.icon} size={17} />
              {feature.label}
            </a>
          ))}
        </div>
      </nav>
      <section className="marketing-section">
        <div className="marketing-container marketing-feature-detail-grid">
          {PRODUCT_FEATURES.map((feature, index) => (
            <article
              id={feature.id}
              className={`marketing-feature-detail marketing-color-${index % 3}`}
              key={feature.id}
            >
              <div className="marketing-feature-detail-top">
                <span className="marketing-feature-icon">
                  <Icon name={feature.icon} size={27} />
                </span>
                <span>
                  0{index + 1} / {feature.label}
                </span>
              </div>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
              <ul>
                {feature.details.map((detail) => (
                  <li key={detail}>
                    <Icon name="check_circle" size={18} />
                    {detail}
                  </li>
                ))}
              </ul>
              <Link to={`${ROUTES.features}/${feature.slug}`} className="marketing-text-link">
                Explore {feature.label.toLowerCase()} <Icon name="arrow_forward" size={18} />
              </Link>
              {feature.id === 'automation' && (
                <Link to={`${ROUTES.features}/sla-management`} className="marketing-text-link">
                  Explore SLA management <Icon name="arrow_forward" size={18} />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
      <section id="workspace" className="marketing-section marketing-workflow-section">
        <div className="marketing-container marketing-split">
          <div>
            <span className="marketing-eyebrow">YOUR ORGANIZATION’S SPACE</span>
            <h2>
              Built for ownership.
              <br />
              <span>Designed for accountability.</span>
            </h2>
            <p>
              Each organization has its own people, customers, tickets and integrations. Your administrators control
              access within that workspace.
            </p>
          </div>
          <ul className="marketing-control-list">
            {[
              {
                icon: 'domain',
                title: 'Separate workspaces',
                text: 'Organization-scoped tickets, customer records, settings and credentials.',
              },
              {
                icon: 'admin_panel_settings',
                title: 'Role-based permissions',
                text: 'Choose who can see, assign, resolve or configure each part of your help desk.',
              },
              {
                icon: 'history',
                title: 'An auditable history',
                text: 'Review important changes and administrator impersonation activity.',
              },
              {
                icon: 'key',
                title: 'Integration controls',
                text: 'Limit API access by scope, rotate credentials and inspect webhook deliveries.',
              },
            ].map((item) => (
              <li key={item.title}>
                <Icon name={item.icon} size={25} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <PublicCta />
    </PublicLayout>
  )
}
