/** Central path registry so routes are never hand-typed as string literals around the app. */
export const ROUTES = {
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  setPassword: '/set-password',
  emailVerification: '/email-verification',
  twoFactor: '/two-factor',
  accountLocked: '/account-locked',
  sessionExpired: '/session-expired',

  dashboard: '/dashboard',
  tickets: '/tickets',
  myTickets: '/my-tickets',
  customers: '/customers',
  departments: '/departments',
  users: '/users',
  rolesAndPermissions: '/roles-and-permissions',
  reports: '/reports',
  automation: '/automation',
  settings: '/settings',
} as const
