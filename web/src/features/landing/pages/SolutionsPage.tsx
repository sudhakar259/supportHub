import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { WorkflowIllustration } from '@/features/landing/components/WorkflowIllustration'
import { SOLUTIONS } from '@/features/landing/content'
import { marketingTone } from '@/features/landing/palette'

export function SolutionsPage() {
  return (
    <PublicLayout>
      <section className="marketing-page-hero">
        <div className="marketing-container marketing-visual-hero-grid">
          <div className="marketing-page-hero-copy">
            <span className="marketing-eyebrow">SUPPORT YOUR WAY</span>
            <h1>
              Customer support & IT helpdesk.
              <br />
              <span>Workflows that fit your team.</span>
            </h1>
            <p>Adapt your departments, priorities and workflows to the way your team helps people.</p>
            <Link to={ROUTES.register} className="marketing-button">
              Create your workspace <Icon name="arrow_forward" size={19} />
            </Link>
          </div>
          <WorkflowIllustration topic="solutions" />
        </div>
      </section>
      <section className="marketing-section">
        <div className="marketing-container marketing-solution-details">
          {SOLUTIONS.map((solution, index) => (
            <article id={`solution-${index}`} key={solution.title} className={`marketing-solution-detail marketing-tone-${marketingTone(solution.icon)}`}>
              <div>
                <span className="marketing-eyebrow">
                  <span className="marketing-topic-icon"><Icon name={solution.icon} size={22} /></span>
                  {solution.title}
                </span>
                <h2>{solution.audience}</h2>
                <p>{solution.description}</p>
                <div className="marketing-tag-list">
                  {solution.features.map((feature) => (
                    <span key={feature}>{feature}</span>
                  ))}
                </div>
                <Link to={ROUTES.demo} className="marketing-text-link">
                  See it in the demo <Icon name="arrow_forward" size={18} />
                </Link>
              </div>
              <div className="marketing-use-case">
                <span>AN EXAMPLE WORKFLOW</span>
                <Icon name={solution.icon} size={42} />
                <p>{solution.example}</p>
                <div>
                  <span>Request received</span>
                  <Icon name="arrow_forward" size={19} />
                  <span>Team assigned</span>
                  <Icon name="arrow_forward" size={19} />
                  <span>Customer helped</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <PublicCta />
    </PublicLayout>
  )
}
