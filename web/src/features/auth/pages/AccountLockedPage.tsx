import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Icon } from '@/components/ui/Icon'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { SITE } from '@/config/site'

/**
 * What a locked-out person can actually do. The sign-in form shows the exact message and the
 * minutes remaining; this page is the longer explanation, so everything it says is true:
 * the lock ends by itself, a password reset clears it, and an administrator can unlock it.
 */
export function AccountLockedPage() {
  return (
    <AuthLayout>
      <AuthCard maxWidthClassName="w-full max-w-2xl" accentClassName="bg-gradient-to-r from-error via-primary to-primary-container">
        <div className="flex flex-col items-start gap-space-lg sm:flex-row">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-surface-container text-error">
            <Icon name="lock" size={36} filled />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-headline-lg font-bold tracking-tight">This account is temporarily locked</h1>
            <p className="mt-space-xs text-body-md text-on-surface-variant">
              There were too many failed sign-in attempts in a row, so sign-in is paused to protect the account. This is automatic and is not a sign that anything has been deleted.
            </p>

            <ol className="mt-space-lg flex flex-col gap-space-md">
              <li className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                <strong className="text-title-sm text-on-surface">Wait about 15 minutes</strong>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">The lock ends on its own. The sign-in page shows how long is left.</p>
              </li>
              <li className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                <strong className="text-title-sm text-on-surface">Reset your password</strong>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  Using the link we email you also clears the lock straight away.{' '}
                  <Link to={ROUTES.forgotPassword} className="font-semibold text-primary underline">
                    Reset password
                  </Link>
                </p>
              </li>
              <li className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                <strong className="text-title-sm text-on-surface">Ask an administrator</strong>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  An administrator of your workspace can unlock you from the Users page.
                  {SITE.supportEmail && (
                    <>
                      {' '}
                      If you were not the one trying to sign in, tell us at{' '}
                      <a href={`mailto:${SITE.supportEmail}`} className="font-semibold text-primary underline">
                        {SITE.supportEmail}
                      </a>
                      .
                    </>
                  )}
                </p>
              </li>
            </ol>

            <Link to={ROUTES.login} className="mt-space-lg inline-flex h-10 items-center rounded-lg bg-primary px-space-lg text-title-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
