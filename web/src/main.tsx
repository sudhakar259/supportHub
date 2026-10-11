import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/App'
import { AppErrorBoundary } from '@/components/feedback/AppErrorBoundary'
import { initErrorReporting } from '@/lib/errorReporting'

import './index.css'

// Starts in the background; without VITE_SENTRY_DSN this does nothing and downloads nothing.
void initErrorReporting()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
