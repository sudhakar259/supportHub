import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { FaqList } from '@/features/landing/components/FaqList'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { HOME_FAQ, PRODUCT_FEATURES, SOLUTIONS } from '@/features/landing/content'
import { marketingTone } from '@/features/landing/palette'

export function LandingPage() {
  const [isMotionPaused, setIsMotionPaused] = useState(false)

  return (
    <PublicLayout>
      <section className="marketing-hero" data-motion={isMotionPaused ? 'paused' : 'running'}>
        <div className="marketing-container marketing-hero-grid">
          <div className="marketing-hero-copy">
            <span className="marketing-eyebrow">
              <span className="marketing-live-dot" aria-hidden="true" /> HELPDESK & CUSTOMER SUPPORT SOFTWARE
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
            <div className="marketing-support-orbit" aria-hidden="true" />
            <figure className="marketing-support-image">
              <picture>
                <source
                  type="image/webp"
                  srcSet="/images/support-team-640.webp 640w, /images/support-team-1280.webp 1280w"
                  sizes="(max-width: 704px) calc(100vw - 36px), (max-width: 1023px) 660px, (max-width: 1280px) 52vw, 624px"
                />
                <img
                  src="/images/support-team.jpg"
                  width={1280}
                  height={960}
                  alt="A customer support representative wearing a headset, with a teammate working nearby in a bright office."
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
              <figcaption>
                <span className="marketing-support-caption-icon"><Icon name="support_agent" size={26} /></span>
                <span className="marketing-support-caption-copy">
                  <small>BUILT FOR CUSTOMER CARE</small>
                  <strong>Good support starts with people.</strong>
                </span>
                <button
                  type="button"
                  className="marketing-hero-motion-toggle"
                  onClick={() => setIsMotionPaused((paused) => !paused)}
                  aria-pressed={isMotionPaused}
                  aria-label={isMotionPaused ? 'Resume hero animations' : 'Pause hero animations'}
                  title={isMotionPaused ? 'Resume animations' : 'Pause animations'}
                >
                  <Icon name={isMotionPaused ? 'play_arrow' : 'pause'} size={19} />
                </button>
              </figcaption>
            </figure>
            <span className="marketing-support-accent marketing-support-accent-mail" aria-hidden="true"><Icon name="mail" size={25} /></span>
            <span className="marketing-support-accent marketing-support-accent-check" aria-hidden="true"><Icon name="task_alt" size={24} /></span>
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
                <span className={`marketing-topic-icon marketing-tone-${marketingTone(item.icon)}`}><Icon name={item.icon} size={21} /></span>
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
            {PRODUCT_FEATURES.map((feature) => (
              <Link key={feature.id} to={`${ROUTES.features}/${feature.slug}`} className={`marketing-feature-card marketing-tone-${marketingTone(feature.slug)}`}>
                <span className="marketing-feature-icon">
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
              <li key={step.title} className={`marketing-tone-${marketingTone(step.icon)}`}>
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
            <div className="marketing-integration-node marketing-tone-blue">
              <span className="marketing-topic-icon"><Icon name="language" size={25} /></span>
              <span>
                Your website or app<small>Customer sends a request</small>
              </span>
            </div>
            <div className="marketing-connector">
              <span />
              Scoped API credentials
              <span />
            </div>
            <div className="marketing-integration-node marketing-integration-hub marketing-tone-primary">
              <span className="marketing-topic-icon"><Icon name="support_agent" size={25} /></span>
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
            <div className="marketing-integration-node marketing-tone-teal">
              <span className="marketing-topic-icon"><Icon name="webhook" size={25} /></span>
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
                className={`marketing-solution-card marketing-tone-${marketingTone(solution.icon)}`}
                key={solution.title}
              >
                <span className="marketing-feature-icon"><Icon name={solution.icon} size={27} /></span>
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
            <span className="marketing-feature-icon marketing-tone-navy"><Icon name="shield" size={32} /></span>
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
