import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { FaqList } from '@/features/landing/components/FaqList'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { HOME_FAQ, PRODUCT_FEATURES, SOLUTIONS } from '@/features/landing/content'

export function LandingPage() {
  return (
    <PublicLayout>
      <section className="marketing-hero">
        <div className="marketing-container marketing-hero-grid">
          <div className="marketing-hero-copy">
            <span className="marketing-eyebrow">
              <span className="marketing-live-dot" /> HELPDESK & CUSTOMER SUPPORT SOFTWARE
            </span>
            <h1>
              Customer support.
              <br />
              One <span>shared desk.</span>
            </h1>
            <p>
              Turn support emails into tickets, route requests to your team and track SLA deadlines. DeskNu brings
              customer conversations, collaboration and reporting into one helpdesk workspace.
            </p>
            <div className="marketing-actions">
              <Link to={ROUTES.register} className="marketing-button">
                Start free trial <Icon name="arrow_forward" size={19} />
              </Link>
              <Link to={ROUTES.demo} className="marketing-button marketing-button-outline">
                <Icon name="play_circle" size={21} />
                Take a product tour
              </Link>
            </div>
            <div className="marketing-hero-reassurance">
              <span>
                <Icon name="check" size={16} />
                Free Starter plan
              </span>
              <span>
                <Icon name="check" size={16} />
                No card needed to begin
              </span>
            </div>
          </div>
          <div className="marketing-hero-visual">
            <div className="marketing-visual-caption">
              <span /> A PLACE FOR EVERY CONVERSATION
            </div>
            <figure className="marketing-product-preview">
              <Link to={ROUTES.demo} aria-label="Explore the DeskNu sample workspace">
                <img
                  src="/images/workspace-preview.jpg"
                  width={1200}
                  height={840}
                  alt="DeskNu sample workspace showing the ticket inbox, customer conversation, assignment and reply controls."
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </Link>
              <figcaption>
                <span>Built for your team’s daily work.</span>
                <Link to={ROUTES.demo}>Explore the product tour <Icon name="arrow_forward" size={16} /></Link>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>
      <section className="marketing-capabilities" aria-label="Product capabilities">
        <div className="marketing-container">
          <span>From “can you help?” to “all sorted.”</span>
          <div>
            {[
              { icon: 'inbox', label: 'Shared ticketing' },
              { icon: 'alt_route', label: 'Smart routing' },
              { icon: 'timer', label: 'SLA tracking' },
              { icon: 'data_object', label: 'Connected workflows' },
            ].map((item) => (
              <span key={item.label}>
                <Icon name={item.icon} size={23} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section id="features" className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-section-heading">
            <div>
              <span className="marketing-eyebrow">A HELP DESK THAT KEEPS UP</span>
              <h2>
                Your daily support tools.
                <br />
                <span>Exactly where you need them.</span>
              </h2>
            </div>
            <Link to={ROUTES.features} className="marketing-text-link">
              Explore all features <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
          <div className="marketing-feature-grid">
            {PRODUCT_FEATURES.map((feature, index) => (
              <Link key={feature.id} to={`${ROUTES.features}/${feature.slug}`} className="marketing-feature-card">
                <span className={`marketing-feature-icon marketing-color-${index % 3}`}>
                  <Icon name={feature.icon} size={25} />
                </span>
                <h3>{feature.label}</h3>
                <p>{feature.description}</p>
                <span className="marketing-card-link">
                  Learn more <Icon name="north_east" size={17} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section id="how-it-works" className="marketing-section marketing-workflow-section">
        <div className="marketing-container">
          <div className="marketing-section-heading marketing-heading-centered">
            <span className="marketing-eyebrow">FROM REQUEST TO RESOLUTION</span>
            <h2>A better flow for your whole team.</h2>
            <p>Clear ownership. Useful context. A customer who knows what’s happening.</p>
          </div>
          <ol className="marketing-steps">
            {[
              {
                icon: 'add_business',
                title: 'Make it your workspace',
                description:
                  'Create your organization, choose a plan and configure your team, departments and ticket preferences.',
              },
              {
                icon: 'forward_to_inbox',
                title: 'Bring requests together',
                description:
                  'Connect inbound email, create tickets in your workspace or bring requests in from your own app with the API.',
              },
              {
                icon: 'task_alt',
                title: 'Keep support moving',
                description:
                  'Route work to the right agent, track SLA deadlines and reply with the full customer story in front of you.',
              },
            ].map((step, index) => (
              <li key={step.title}>
                <div className="marketing-step-top">
                  <span>
                    <Icon name={step.icon} size={29} />
                  </span>
                  <b>0{index + 1}</b>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="marketing-section marketing-integrations">
        <div className="marketing-container marketing-split">
          <div>
            <span className="marketing-eyebrow">SUPPORT THAT FITS YOUR STACK</span>
            <h2>
              Your product.
              <br />
              Your customers.
              <br />
              <span>One connected conversation.</span>
            </h2>
            <p>
              Keep your customers on your website while your team works in DeskNu. Create tickets and send replies
              through the API, then keep your app updated with signed webhooks.
            </p>
            <Link to={`${ROUTES.features}/api-webhooks`} className="marketing-text-link">
              See how it connects <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
          <div className="marketing-integration-map">
            <div className="marketing-integration-node">
              <Icon name="language" size={25} />
              <span>
                Your website or app<small>Customer sends a request</small>
              </span>
            </div>
            <div className="marketing-connector">
              <span />
              Scoped API credentials
              <span />
            </div>
            <div className="marketing-integration-node marketing-integration-hub">
              <Icon name="support_agent" size={28} />
              <span>
                DeskNu<small>Your team picks up the conversation</small>
              </span>
              <span className="marketing-hub-badge">Ticket created</span>
            </div>
            <div className="marketing-connector">
              <span />
              Signed ticket events
              <span />
            </div>
            <div className="marketing-integration-node">
              <Icon name="webhook" size={25} />
              <span>
                Your connected systems<small>Stay up to date with webhooks</small>
              </span>
            </div>
            <p>Illustrative integration workflow</p>
          </div>
        </div>
      </section>
      <section className="marketing-section">
        <div className="marketing-container">
          <div className="marketing-section-heading">
            <div>
              <span className="marketing-eyebrow">DIFFERENT TEAMS. THE SAME CARE.</span>
              <h2>Make it work for your kind of support.</h2>
            </div>
            <Link to={ROUTES.solutions} className="marketing-text-link">
              Find your fit <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
          <div className="marketing-solutions-grid">
            {SOLUTIONS.map((solution, index) => (
              <Link
                to={`${ROUTES.solutions}#solution-${index}`}
                className="marketing-solution-card"
                key={solution.title}
              >
                <Icon name={solution.icon} size={29} />
                <h3>{solution.title}</h3>
                <p>{solution.description}</p>
                <span className="marketing-card-link">
                  Explore the workflow <Icon name="arrow_forward" size={17} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="marketing-security-strip">
        <div className="marketing-container">
          <div>
            <Icon name="shield" size={37} />
            <h2>
              Your workspace.
              <br />
              Your team’s boundaries.
            </h2>
          </div>
          <p>
            Organization-level data separation, role-based permissions, private notes and an audit trail help keep
            customer information in the right hands.
          </p>
          <Link to={ROUTES.security} className="marketing-text-link">
            Built-in controls <Icon name="arrow_forward" size={18} />
          </Link>
        </div>
      </section>
      <section className="marketing-section">
        <div className="marketing-container marketing-faq-section">
          <div>
            <span className="marketing-eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</span>
            <h2>
              Frequently
              <br /> asked questions.
            </h2>
            <p>Get to know DeskNu before you get started.</p>
            <Link to={ROUTES.pricing} className="marketing-text-link">
              Compare plans <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
          <FaqList items={HOME_FAQ} />
        </div>
      </section>
      <PublicCta />
    </PublicLayout>
  )
}
