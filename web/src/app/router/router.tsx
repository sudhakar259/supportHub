import { Navigate, createBrowserRouter } from 'react-router-dom'

import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { ROUTES } from '@/app/router/routes'
import { AppShell } from '@/components/layout/AppShell'
import { ComingSoonPage } from '@/components/feedback/ComingSoonPage'
import { AccountLockedPage } from '@/features/auth/pages/AccountLockedPage'
import { EmailVerificationPage } from '@/features/auth/pages/EmailVerificationPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { SessionExpiredPage } from '@/features/auth/pages/SessionExpiredPage'
import { SetPasswordPage } from '@/features/auth/pages/SetPasswordPage'
import { TwoFactorAuthPage } from '@/features/auth/pages/TwoFactorAuthPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={ROUTES.dashboard} replace /> },

  { path: ROUTES.login, element: <LoginPage /> },
  { path: ROUTES.forgotPassword, element: <ForgotPasswordPage /> },
  { path: ROUTES.resetPassword, element: <ResetPasswordPage /> },
  { path: ROUTES.setPassword, element: <SetPasswordPage /> },
  { path: ROUTES.emailVerification, element: <EmailVerificationPage /> },
  { path: ROUTES.twoFactor, element: <TwoFactorAuthPage /> },
  { path: ROUTES.accountLocked, element: <AccountLockedPage /> },
  { path: ROUTES.sessionExpired, element: <SessionExpiredPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: ROUTES.dashboard, element: <DashboardPage /> },
          { path: ROUTES.tickets, element: <ComingSoonPage title="Tickets" /> },
          { path: ROUTES.myTickets, element: <ComingSoonPage title="My Tickets" /> },
          { path: ROUTES.customers, element: <ComingSoonPage title="Customers" /> },
          { path: ROUTES.departments, element: <ComingSoonPage title="Departments" /> },
          { path: ROUTES.users, element: <ComingSoonPage title="Users" /> },
          { path: ROUTES.rolesAndPermissions, element: <ComingSoonPage title="Roles & Permissions" /> },
          { path: ROUTES.reports, element: <ComingSoonPage title="Reports" /> },
          { path: ROUTES.automation, element: <ComingSoonPage title="Automation" /> },
          { path: ROUTES.settings, element: <ComingSoonPage title="Settings" /> },
          { path: '*', element: <ComingSoonPage title="Not Found" /> },
        ],
      },
    ],
  },
])
