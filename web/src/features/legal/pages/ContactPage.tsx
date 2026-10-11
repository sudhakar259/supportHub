import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { SITE } from '@/config/site'

export function ContactPage() {
  return (
    <PublicLayout>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-space-xl px-margin-mobile py-space-xl sm:px-margin lg:py-16">
        <div className="flex flex-col gap-space-sm">
          <h1 className="text-display-lg tracking-tight text-on-surface">Contact us</h1>
          <p className="text-body-lg text-on-surface-variant">Questions about plans, Enterprise pricing, privacy or your account? We would like to hear from you.</p>
        </div>

        <div className="grid gap-gutter-lg sm:grid-cols-2">
          <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <Icon name="mail" size={24} className="text-primary" />
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

          <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <Icon name="support_agent" size={24} className="text-primary" />
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
    </PublicLayout>
  )
}
