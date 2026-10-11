import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Icon } from '@/components/ui/Icon'
import { SITE } from '@/config/site'

export interface NotFoundContentProps {
  /** Where "go home" leads: the dashboard inside the app, the start page outside it. */
  homeTo?: string
  homeLabel?: string
}

/** The message itself, for use inside a page frame (the signed-in app, the platform console, or the public layout). */
export function NotFoundContent({ homeTo = ROUTES.home, homeLabel = 'Go to the start page' }: NotFoundContentProps) {
  const navigate = useNavigate()

  // Runs after the SEO component's own title update, so this is the title that stays.
  useEffect(() => {
    document.title = `Page not found | ${SITE.name}`
  }, [])

  return (
    <section className="flex flex-col items-center justify-center gap-space-md p-gutter-lg py-space-xl text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-primary">
        <Icon name="travel_explore" size={30} />
      </div>
      <p className="text-label-md uppercase tracking-wider text-on-surface-variant">Error 404</p>
      <h1 className="text-headline-lg text-on-surface">We can’t find that page</h1>
      <p className="max-w-md text-body-md text-on-surface-variant">
        The address may be mistyped, or the page may have moved. Nothing is wrong with your account.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-space-sm">
        <Link
          to={homeTo}
          className="inline-flex h-11 items-center rounded-lg bg-primary px-space-lg text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
        >
          {homeLabel}
        </Link>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex h-11 items-center rounded-lg bg-surface-container-low px-space-lg text-title-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
        >
          Go back
        </button>
      </div>
    </section>
  )
}

/** A full page with the public header and footer, for people who are not signed in. */
export function NotFoundPage() {
  return (
    <AuthLayout>
      <NotFoundContent />
    </AuthLayout>
  )
}
