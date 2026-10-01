import { Navigate, createBrowserRouter } from 'react-router-dom'

import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { RequirePermission } from '@/app/router/RequirePermission'
import { ROUTES } from '@/app/router/routes'
import { AppShell } from '@/components/layout/AppShell'
import { ComingSoonPage } from '@/components/feedback/ComingSoonPage'
import { AccountLockedPage } from '@/features/auth/pages/AccountLockedPage'
import { AutomationPage } from '@/features/automation/pages/AutomationPage'
import { EmailVerificationPage } from '@/features/auth/pages/EmailVerificationPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { SessionExpiredPage } from '@/features/auth/pages/SessionExpiredPage'
import { SetPasswordPage } from '@/features/auth/pages/SetPasswordPage'
import { TwoFactorAuthPage } from '@/features/auth/pages/TwoFactorAuthPage'
import { CategoriesListPage } from '@/features/categories/pages/CategoriesListPage'
import { CustomerDetailsPage } from '@/features/customers/pages/CustomerDetailsPage'
import { CustomersListPage } from '@/features/customers/pages/CustomersListPage'
import { DepartmentDetailsPage } from '@/features/departments/pages/DepartmentDetailsPage'
import { DepartmentsListPage } from '@/features/departments/pages/DepartmentsListPage'
import { RoleDetailsPage } from '@/features/roles/pages/RoleDetailsPage'
import { RolesListPage } from '@/features/roles/pages/RolesListPage'
import { AuditLogsPage } from '@/features/reports/pages/AuditLogsPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SystemSettingsPage } from '@/features/settings/pages/SystemSettingsPage'
import { CreateTicketPage } from '@/features/tickets/pages/CreateTicketPage'
import { TicketConfigPage } from '@/features/tickets/pages/TicketConfigPage'
import { TicketDetailsPage } from '@/features/tickets/pages/TicketDetailsPage'
import { TicketsDashboardPage } from '@/features/tickets/pages/TicketsDashboardPage'
import { TicketsListPage } from '@/features/tickets/pages/TicketsListPage'
import { UsersListPage } from '@/features/users/pages/UsersListPage'

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
          { path: ROUTES.dashboard, element: <TicketsDashboardPage /> },
          { path: ROUTES.createTicket, element: <CreateTicketPage /> },
          { path: ROUTES.tickets, element: <TicketsListPage /> },
          { path: '/tickets/:ticketId', element: <TicketDetailsPage /> },
          { path: ROUTES.myTickets, element: <TicketsListPage scope="mine" /> },
          {
            path: ROUTES.customers,
            element: <RequirePermission permission="customers.view"><CustomersListPage /></RequirePermission>,
          },
          {
            path: '/customers/:customerId',
            element: <RequirePermission permission="customers.view"><CustomerDetailsPage /></RequirePermission>,
          },
          {
            path: ROUTES.departments,
            element: <RequirePermission permission="departments.view"><DepartmentsListPage /></RequirePermission>,
          },
          {
            path: '/departments/:departmentId',
            element: <RequirePermission permission="departments.view"><DepartmentDetailsPage /></RequirePermission>,
          },
          { path: ROUTES.users, element: <RequirePermission permission="users.view"><UsersListPage /></RequirePermission> },
          {
            path: ROUTES.rolesAndPermissions,
            element: <RequirePermission permission="roles.view"><RolesListPage /></RequirePermission>,
          },
          {
            path: '/roles-and-permissions/:roleId',
            element: <RequirePermission permission="roles.view"><RoleDetailsPage /></RequirePermission>,
          },
          {
            path: ROUTES.categories,
            element: <RequirePermission permission="categories.view"><CategoriesListPage /></RequirePermission>,
          },
          {
            path: ROUTES.ticketConfig,
            element: (
              <RequirePermission permission={['statuses.view', 'priorities.view']}>
                <TicketConfigPage />
              </RequirePermission>
            ),
          },
          { path: ROUTES.reports, element: <RequirePermission permission="reports.view"><ReportsPage /></RequirePermission> },
          {
            path: ROUTES.auditLogs,
            element: <RequirePermission permission="audit-logs.view"><AuditLogsPage /></RequirePermission>,
          },
          {
            path: ROUTES.automation,
            element: (
              <RequirePermission permission={['routing.view', 'sla.view', 'notifications.view']}>
                <AutomationPage />
              </RequirePermission>
            ),
          },
          {
            path: ROUTES.settings,
            element: <RequirePermission permission="settings.view"><SystemSettingsPage /></RequirePermission>,
          },
          { path: '*', element: <ComingSoonPage title="Not Found" /> },
        ],
      },
    ],
  },
])
