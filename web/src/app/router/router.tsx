import { lazy } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'

import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { RequirePermission } from '@/app/router/RequirePermission'
import { RequirePlatformAdmin } from '@/app/router/RequirePlatformAdmin'
import { RequireTenantUser } from '@/app/router/RequireTenantUser'
import { ROUTES } from '@/app/router/routes'
import { AppShell } from '@/components/layout/AppShell'
import { PlatformShell } from '@/components/layout/PlatformShell'
import { ComingSoonPage } from '@/components/feedback/ComingSoonPage'

import { WorkspaceEntry } from '@/features/workspaces/WorkspaceEntry'

const AccountLockedPage = lazy(() =>
  import('@/features/auth/pages/AccountLockedPage').then((module) => ({ default: module.AccountLockedPage })),
)
const AutomationPage = lazy(() =>
  import('@/features/automation/pages/AutomationPage').then((module) => ({ default: module.AutomationPage })),
)
const EmailVerificationPage = lazy(() =>
  import('@/features/auth/pages/EmailVerificationPage').then((module) => ({ default: module.EmailVerificationPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })),
)
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const ContactPage = lazy(() =>
  import('@/features/legal/pages/ContactPage').then((module) => ({ default: module.ContactPage })),
)
const CookiesPage = lazy(() =>
  import('@/features/legal/pages/CookiesPage').then((module) => ({ default: module.CookiesPage })),
)
const PrivacyPage = lazy(() =>
  import('@/features/legal/pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })),
)
const TermsPage = lazy(() =>
  import('@/features/legal/pages/TermsPage').then((module) => ({ default: module.TermsPage })),
)
const FeaturesPage = lazy(() =>
  import('@/features/landing/pages/FeaturesPage').then((module) => ({ default: module.FeaturesPage })),
)
const SolutionsPage = lazy(() =>
  import('@/features/landing/pages/SolutionsPage').then((module) => ({ default: module.SolutionsPage })),
)
const DemoPage = lazy(() =>
  import('@/features/landing/pages/DemoPage').then((module) => ({ default: module.DemoPage })),
)
const ResetPasswordPage = lazy(() =>
  import('@/features/auth/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })),
)
const SessionExpiredPage = lazy(() =>
  import('@/features/auth/pages/SessionExpiredPage').then((module) => ({ default: module.SessionExpiredPage })),
)
const SetPasswordPage = lazy(() =>
  import('@/features/auth/pages/SetPasswordPage').then((module) => ({ default: module.SetPasswordPage })),
)
const TwoFactorAuthPage = lazy(() =>
  import('@/features/auth/pages/TwoFactorAuthPage').then((module) => ({ default: module.TwoFactorAuthPage })),
)
const CategoriesListPage = lazy(() =>
  import('@/features/categories/pages/CategoriesListPage').then((module) => ({ default: module.CategoriesListPage })),
)
const CustomerDetailsPage = lazy(() =>
  import('@/features/customers/pages/CustomerDetailsPage').then((module) => ({ default: module.CustomerDetailsPage })),
)
const CustomersListPage = lazy(() =>
  import('@/features/customers/pages/CustomersListPage').then((module) => ({ default: module.CustomersListPage })),
)
const DepartmentDetailsPage = lazy(() =>
  import('@/features/departments/pages/DepartmentDetailsPage').then((module) => ({
    default: module.DepartmentDetailsPage,
  })),
)
const DepartmentsListPage = lazy(() =>
  import('@/features/departments/pages/DepartmentsListPage').then((module) => ({
    default: module.DepartmentsListPage,
  })),
)
const ApiCredentialDetailsPage = lazy(() =>
  import('@/features/integrations/pages/ApiCredentialDetailsPage').then((module) => ({
    default: module.ApiCredentialDetailsPage,
  })),
)
const ApiCredentialsListPage = lazy(() =>
  import('@/features/integrations/pages/ApiCredentialsListPage').then((module) => ({
    default: module.ApiCredentialsListPage,
  })),
)
const CreateApiCredentialPage = lazy(() =>
  import('@/features/integrations/pages/CreateApiCredentialPage').then((module) => ({
    default: module.CreateApiCredentialPage,
  })),
)
const BillingPage = lazy(() =>
  import('@/features/billing/pages/BillingPage').then((module) => ({ default: module.BillingPage })),
)
const CheckoutPage = lazy(() =>
  import('@/features/billing/pages/CheckoutPage').then((module) => ({ default: module.CheckoutPage })),
)
const OnboardingPage = lazy(() =>
  import('@/features/onboarding/pages/OnboardingPage').then((module) => ({ default: module.OnboardingPage })),
)
const MembershipPlansListPage = lazy(() =>
  import('@/features/platform/pages/MembershipPlansListPage').then((module) => ({
    default: module.MembershipPlansListPage,
  })),
)
const PlatformDashboardPage = lazy(() =>
  import('@/features/platform/pages/PlatformDashboardPage').then((module) => ({
    default: module.PlatformDashboardPage,
  })),
)
const TenantDetailsPage = lazy(() =>
  import('@/features/platform/pages/TenantDetailsPage').then((module) => ({ default: module.TenantDetailsPage })),
)
const TenantsListPage = lazy(() =>
  import('@/features/platform/pages/TenantsListPage').then((module) => ({ default: module.TenantsListPage })),
)
const RoleDetailsPage = lazy(() =>
  import('@/features/roles/pages/RoleDetailsPage').then((module) => ({ default: module.RoleDetailsPage })),
)
const RolesListPage = lazy(() =>
  import('@/features/roles/pages/RolesListPage').then((module) => ({ default: module.RolesListPage })),
)
const PricingPage = lazy(() =>
  import('@/features/tenants/pages/PricingPage').then((module) => ({ default: module.PricingPage })),
)
const RegistrationPage = lazy(() =>
  import('@/features/tenants/pages/RegistrationPage').then((module) => ({ default: module.RegistrationPage })),
)
const WebhookDeliveriesPage = lazy(() =>
  import('@/features/webhooks/pages/WebhookDeliveriesPage').then((module) => ({
    default: module.WebhookDeliveriesPage,
  })),
)
const WebhooksListPage = lazy(() =>
  import('@/features/webhooks/pages/WebhooksListPage').then((module) => ({ default: module.WebhooksListPage })),
)
const AuditLogsPage = lazy(() =>
  import('@/features/reports/pages/AuditLogsPage').then((module) => ({ default: module.AuditLogsPage })),
)
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })),
)
const SystemSettingsPage = lazy(() =>
  import('@/features/settings/pages/SystemSettingsPage').then((module) => ({ default: module.SystemSettingsPage })),
)
const CreateTicketPage = lazy(() =>
  import('@/features/tickets/pages/CreateTicketPage').then((module) => ({ default: module.CreateTicketPage })),
)
const TicketConfigPage = lazy(() =>
  import('@/features/tickets/pages/TicketConfigPage').then((module) => ({ default: module.TicketConfigPage })),
)
const TicketDetailsPage = lazy(() =>
  import('@/features/tickets/pages/TicketDetailsPage').then((module) => ({ default: module.TicketDetailsPage })),
)
const TicketsDashboardPage = lazy(() =>
  import('@/features/tickets/pages/TicketsDashboardPage').then((module) => ({ default: module.TicketsDashboardPage })),
)
const TicketsListPage = lazy(() =>
  import('@/features/tickets/pages/TicketsListPage').then((module) => ({ default: module.TicketsListPage })),
)
const AccountSecurityPage = lazy(() =>
  import('@/features/account/pages/AccountSecurityPage').then((module) => ({ default: module.AccountSecurityPage })),
)
const UsersListPage = lazy(() =>
  import('@/features/users/pages/UsersListPage').then((module) => ({ default: module.UsersListPage })),
)

export const router = createBrowserRouter([
  { path: '/', element: <WorkspaceEntry /> },
  { path: ROUTES.features, element: <FeaturesPage /> },
  { path: ROUTES.solutions, element: <SolutionsPage /> },
  { path: ROUTES.demo, element: <DemoPage /> },

  { path: ROUTES.register, element: <RegistrationPage /> },
  { path: ROUTES.pricing, element: <PricingPage /> },
  { path: ROUTES.contact, element: <ContactPage /> },
  { path: ROUTES.terms, element: <TermsPage /> },
  { path: ROUTES.privacy, element: <PrivacyPage /> },
  { path: ROUTES.cookies, element: <CookiesPage /> },
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
        element: <RequireTenantUser />,
        children: [
          { path: ROUTES.onboarding, element: <OnboardingPage /> },
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
                element: (
                  <RequirePermission permission="customers.view">
                    <CustomersListPage />
                  </RequirePermission>
                ),
              },
              {
                path: '/customers/:customerId',
                element: (
                  <RequirePermission permission="customers.view">
                    <CustomerDetailsPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.departments,
                element: (
                  <RequirePermission permission="departments.view">
                    <DepartmentsListPage />
                  </RequirePermission>
                ),
              },
              {
                path: '/departments/:departmentId',
                element: (
                  <RequirePermission permission="departments.view">
                    <DepartmentDetailsPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.users,
                element: (
                  <RequirePermission permission="users.view">
                    <UsersListPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.rolesAndPermissions,
                element: (
                  <RequirePermission permission="roles.view">
                    <RolesListPage />
                  </RequirePermission>
                ),
              },
              {
                path: '/roles-and-permissions/:roleId',
                element: (
                  <RequirePermission permission="roles.view">
                    <RoleDetailsPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.categories,
                element: (
                  <RequirePermission permission="categories.view">
                    <CategoriesListPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.ticketConfig,
                element: (
                  <RequirePermission permission={['statuses.view', 'priorities.view']}>
                    <TicketConfigPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.reports,
                element: (
                  <RequirePermission permission="reports.view">
                    <ReportsPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.auditLogs,
                element: (
                  <RequirePermission permission="audit-logs.view">
                    <AuditLogsPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.automation,
                element: (
                  <RequirePermission permission={['routing.view', 'sla.view', 'notifications.view']}>
                    <AutomationPage />
                  </RequirePermission>
                ),
              },
              { path: ROUTES.accountSecurity, element: <AccountSecurityPage /> },
              {
                path: ROUTES.settings,
                element: (
                  <RequirePermission permission="settings.view">
                    <SystemSettingsPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.apiCredentials,
                element: (
                  <RequirePermission permission="api-credentials.view">
                    <ApiCredentialsListPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.apiCredentialsCreate,
                element: (
                  <RequirePermission permission="api-credentials.create">
                    <CreateApiCredentialPage />
                  </RequirePermission>
                ),
              },
              {
                path: '/integrations/api-credentials/:credentialId',
                element: (
                  <RequirePermission permission="api-credentials.view">
                    <ApiCredentialDetailsPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.webhooks,
                element: (
                  <RequirePermission permission="webhooks.view">
                    <WebhooksListPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.billing,
                element: (
                  <RequirePermission permission="billing.view">
                    <BillingPage />
                  </RequirePermission>
                ),
              },
              {
                path: ROUTES.billingCheckout,
                element: (
                  <RequirePermission permission="billing.manage">
                    <CheckoutPage />
                  </RequirePermission>
                ),
              },
              {
                path: '/integrations/webhooks/:webhookId/deliveries',
                element: (
                  <RequirePermission permission="webhooks.view">
                    <WebhookDeliveriesPage />
                  </RequirePermission>
                ),
              },
              { path: '*', element: <ComingSoonPage title="Not Found" /> },
            ],
          },
        ],
      },
      {
        element: <RequirePlatformAdmin />,
        children: [
          {
            element: <PlatformShell />,
            children: [
              { path: ROUTES.platform, element: <Navigate to={ROUTES.platformDashboard} replace /> },
              { path: ROUTES.platformDashboard, element: <PlatformDashboardPage /> },
              { path: ROUTES.platformTenants, element: <TenantsListPage /> },
              { path: '/platform/tenants/:tenantId', element: <TenantDetailsPage /> },
              { path: ROUTES.platformPlans, element: <MembershipPlansListPage /> },
              { path: ROUTES.platformAccountSecurity, element: <AccountSecurityPage /> },
              { path: '/platform/*', element: <ComingSoonPage title="Platform Admin Console" /> },
            ],
          },
        ],
      },
    ],
  },
])
