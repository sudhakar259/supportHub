import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'

import { AppProviders } from '@/app/providers/AppProviders'
import { router } from '@/app/router/router'
import { LoadingState } from '@/components/feedback/LoadingState'

export function App() {
  return (
    <AppProviders>
      <Suspense fallback={<LoadingState label="Opening SupportHub…" />}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProviders>
  )
}
