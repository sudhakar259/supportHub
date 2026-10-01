import { ROUTES } from '@/app/router/routes'

export interface NavItem {
  label: string
  path: string
  icon: string
  /** Static badge count shown next to the label; wired to live data once the tickets API lands. */
  badge?: number
  /**
   * Permission(s) gating this nav item's visibility — matches the resource.view
   * permission the destination page's index endpoint actually requires (see
   * RolesAndPermissionsSeeder::PERMISSIONS). An array means "has at least one
   * of these". Omit for pages every authenticated user can reach (Dashboard,
   * Tickets, My Tickets). This is UX-only: the API enforces the real authorization.
   */
  permission?: string | string[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Dashboard', path: ROUTES.dashboard, icon: 'grid_view' },
      { label: 'Tickets', path: ROUTES.tickets, icon: 'confirmation_number' },
      { label: 'My Tickets', path: ROUTES.myTickets, icon: 'assignment_ind' },
      { label: 'Customers', path: ROUTES.customers, icon: 'group', permission: 'customers.view' },
      { label: 'Departments', path: ROUTES.departments, icon: 'apartment', permission: 'departments.view' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { label: 'Users', path: ROUTES.users, icon: 'manage_accounts', permission: 'users.view' },
      { label: 'Roles & Permissions', path: ROUTES.rolesAndPermissions, icon: 'admin_panel_settings', permission: 'roles.view' },
      { label: 'Categories', path: ROUTES.categories, icon: 'category', permission: 'categories.view' },
      { label: 'Statuses & Priorities', path: ROUTES.ticketConfig, icon: 'tune', permission: ['statuses.view', 'priorities.view'] },
      { label: 'Reports', path: ROUTES.reports, icon: 'insights', permission: 'reports.view' },
      { label: 'Audit Logs', path: ROUTES.auditLogs, icon: 'history', permission: 'audit-logs.view' },
      { label: 'Automation', path: ROUTES.automation, icon: 'auto_mode', permission: ['routing.view', 'sla.view', 'notifications.view'] },
      { label: 'Settings', path: ROUTES.settings, icon: 'settings', permission: 'settings.view' },
    ],
  },
]
