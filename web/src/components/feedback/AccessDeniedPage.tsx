import { Icon } from '@/components/ui/Icon'

/**
 * Shown by RequirePermission when a signed-in user navigates directly to a
 * screen their role can't use. Previously there was no route-level
 * permission check at all — any authenticated role (including Customer)
 * got the full page shell and every action button for every screen; only
 * the underlying API calls (correctly) 403'd. QA finding, 2026-10-01.
 */
export function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-space-sm p-gutter-lg py-space-xl text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-error">
        <Icon name="lock" size={24} />
      </div>
      <h1 className="text-headline-sm text-on-surface">You don&apos;t have access to this page</h1>
      <p className="max-w-sm text-body-sm text-on-surface-variant">
        Your role doesn&apos;t include the permission this screen requires. Contact an administrator if you believe this is
        wrong.
      </p>
    </div>
  )
}
