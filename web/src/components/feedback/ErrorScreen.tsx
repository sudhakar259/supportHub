import { Icon } from '@/components/ui/Icon'

export interface ErrorScreenProps {
  title: string
  message: string
  /** Short code the person can quote to support; it is attached to the report. */
  reference?: string
  /** Offer "Reload" (the usual fix for a stale page or a dropped connection). */
  canReload?: boolean
  /** Technical detail, shown only in development. */
  detail?: string
}

/**
 * Full-page message for when something crashed. Deliberately self-contained: no router, auth or layout, because it
 * is what shows when those are what broke. Plain links (not router links) also reset the app to a clean state.
 */
export function ErrorScreen({ title, message, reference, canReload = true, detail }: ErrorScreenProps) {
  return (
    <main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-space-md bg-surface p-gutter-lg text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-container text-error">
        <Icon name="error" size={30} filled />
      </div>
      <h1 className="text-headline-md text-on-surface">{title}</h1>
      <p className="max-w-md text-body-md text-on-surface-variant">{message}</p>

      <div className="flex flex-wrap items-center justify-center gap-space-sm">
        {canReload && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center rounded-lg bg-primary px-space-lg text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            Reload page
          </button>
        )}
        <a
          href="/"
          className="inline-flex h-11 items-center rounded-lg bg-surface-container-low px-space-lg text-title-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
        >
          Go to the start page
        </a>
      </div>

      {reference && (
        <p className="text-body-sm text-on-surface-variant">
          If this keeps happening, tell support this reference: <code className="rounded bg-surface-container px-1.5 py-0.5 text-code-sm text-on-surface">{reference}</code>
        </p>
      )}
      {import.meta.env.DEV && detail && <pre className="max-w-2xl overflow-auto rounded-lg bg-surface-container-low p-space-md text-left text-code-sm text-on-surface-variant">{detail}</pre>}
    </main>
  )
}
