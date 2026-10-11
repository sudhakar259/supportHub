import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { SITE } from '@/config/site'
import { WorkflowIllustration } from '@/features/landing/components/WorkflowIllustration'

export function ContactPage() {
  return (
    <PublicLayout>
      <section className="marketing-page-hero">
        <div className="marketing-container marketing-visual-hero-grid">
          <div className="marketing-page-hero-copy">
            <span className="marketing-eyebrow">LET’S FIND YOUR NEXT STEP</span>
            <h1>Contact DeskNu.<br /><span>We’re here to help.</span></h1>
            <p>Questions about plans, Enterprise pricing, privacy or your account? Tell us what your team needs.</p>
            <a href="#contact-options" className="marketing-button">Find the right contact <Icon name="arrow_downward" size={18} /></a>
          </div>
          <WorkflowIllustration topic="contact" />
        </div>
      </section>
      <section id="contact-options" className="marketing-section">
      <div className="marketing-container">
        <div className="grid gap-gutter-lg sm:grid-cols-2">
          <div className="marketing-contact-tile marketing-tone-blue flex flex-col gap-space-sm rounded-xl p-space-lg shadow-sm">
            <span className="marketing-feature-icon"><Icon name="mail" size={24} /></span>
            <h2 className="text-title-md font-semibold">Email</h2>
            {SITE.supportEmail ? (
              <a href={`mailto:${SITE.supportEmail}`} className="text-body-md text-primary underline">
                {SITE.supportEmail}
              </a>
            ) : (
              <p className="text-body-sm text-on-surface-variant">Our contact email has not been published yet. Please check back soon.</p>
            )}
            <p className="text-body-sm text-on-surface-variant">For Enterprise pricing, mention the size of your team and the number of tickets you handle each month.</p>
          </div>

          <div className="marketing-contact-tile marketing-tone-primary flex flex-col gap-space-sm rounded-xl p-space-lg shadow-sm">
            <span className="marketing-feature-icon"><Icon name="support_agent" size={24} /></span>
            <h2 className="text-title-md font-semibold">Already a customer?</h2>
            <p className="text-body-sm text-on-surface-variant">Sign in to your workspace to manage your plan, invoices and team. If you cannot sign in, reset your password.</p>
            <div className="flex flex-wrap gap-space-md text-body-sm">
              <Link to={ROUTES.login} className="font-semibold text-primary underline">
                Sign in
              </Link>
              <Link to={ROUTES.forgotPassword} className="font-semibold text-primary underline">
                Reset password
              </Link>
            </div>
          </div>
        </div>
      </div>
      </section>
    </PublicLayout>
  )
}
