import type { ReactNode } from 'react'

import { ToastProvider } from '@/components/feedback/ToastProvider'
import { AuthProvider } from '@/features/auth/hooks/useAuth'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  )
}
