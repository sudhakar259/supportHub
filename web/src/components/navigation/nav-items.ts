import { ROUTES } from '@/app/router/routes'

export interface NavItem {
  label: string
  path: string
  icon: string
  /** Static badge count shown next to the label; wired to live data once the tickets API lands. */
  badge?: number
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
      { label: 'Customers', path: ROUTES.customers, icon: 'group' },
      { label: 'Departments', path: ROUTES.departments, icon: 'apartment' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { label: 'Users', path: ROUTES.users, icon: 'manage_accounts' },
      { label: 'Roles & Permissions', path: ROUTES.rolesAndPermissions, icon: 'admin_panel_settings' },
      { label: 'Reports', path: ROUTES.reports, icon: 'insights' },
      { label: 'Automation', path: ROUTES.automation, icon: 'auto_mode' },
      { label: 'Settings', path: ROUTES.settings, icon: 'settings' },
    ],
  },
]
