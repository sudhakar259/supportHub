import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { ErrorScreen } from '@/components/feedback/ErrorScreen'
import { isStaleBundleError, newReference, reportError } from '@/lib/errorReporting'

interface State {
  error: unknown
  reference: string | null
}

/**
 * Last line of defence, around the whole app. The router's error page covers a page that throws; this covers
 * everything outside it (the providers, the router itself), so a crash anywhere shows a calm message instead of a
 * blank white screen.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, reference: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error, reference: newReference() }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    reportError(error, { source: 'app-boundary', reference: this.state.reference ?? undefined })
    if (import.meta.env.DEV) console.error(info.componentStack)
  }

  render() {
    const { error, reference } = this.state
    if (error === null) return this.props.children

    return (
      <ErrorScreen
        title={isStaleBundleError(error) ? 'This page needs a refresh' : 'Something went wrong'}
        message={
          isStaleBundleError(error)
            ? 'We have probably just updated, or your connection dropped while the page was loading. Reloading usually fixes it.'
            : 'The application stopped unexpectedly. Your work is safe. Try reloading; if it keeps happening, let us know.'
        }
        reference={reference ?? undefined}
        detail={error instanceof Error ? (error.stack ?? error.message) : String(error)}
      />
    )
  }
}
