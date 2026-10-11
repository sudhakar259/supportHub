import { Navigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { workspaceSlug } from './workspace'

export function WorkspaceEntry() {
  return workspaceSlug() ? <Navigate to={ROUTES.dashboard} replace /> : <LandingPage />
}
