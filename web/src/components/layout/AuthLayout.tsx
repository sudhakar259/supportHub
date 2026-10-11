import type { ReactNode } from 'react'

import { PublicLayout } from '@/components/layout/PublicLayout'

/**
 * Frame for the sign-in, registration, recovery and lockout screens. It reuses
 * the public site's header and footer so moving between the home page, pricing
 * and these forms never changes the surrounding chrome; only the centered
 * content slot differs.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <PublicLayout>
      <div className="flex w-full flex-1 flex-col items-center justify-center bg-surface px-margin-mobile py-space-xl sm:px-margin">{children}</div>
    </PublicLayout>
  )
}
