import { useEffect, useState } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

import { ErrorScreen } from '@/components/feedback/ErrorScreen'
import { NotFoundPage } from '@/components/feedback/NotFoundPage'
import { isStaleBundleError, newReference, reportError } from '@/lib/errorReporting'

/**
 * Router `errorElement`: what a person sees when a page throws while loading or rendering. Replaces React Router's
 * default "Unexpected Application Error!" screen, which shows developer text. The error is reported once, with a
 * short reference that is also shown to the person.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  // One reference per appearance of this screen, which is one per error.
  const [reference] = useState(newReference)

  useEffect(() => {
    if (!notFound) reportError(error, { source: 'router', reference })
  }, [error, notFound, reference])

  if (notFound) return <NotFoundPage />

  if (isStaleBundleError(error)) {
    return (
      <ErrorScreen
        title="This page needs a refresh"
        message="We have probably just updated, or your connection dropped while the page was loading. Reloading usually fixes it."
        reference={reference}
        detail={String(error)}
      />
    )
  }

  return (
    <ErrorScreen
      title="Something went wrong"
      message="We hit a problem showing this page. Your work is safe. Try reloading; if it keeps happening, let us know."
      reference={reference}
      detail={error instanceof Error ? (error.stack ?? error.message) : String(error)}
    />
  )
}
