/**
 * Public-site settings. Set these per deployment (see .env.example); nothing
 * here is secret, it is all shown on the public pages.
 */
export const SITE = {
  name: 'DeskZeal',
  /** Canonical public website, compiled into page metadata and the sitemap. */
  url: (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '') || 'https://deskzeal.com',
  /** Legal entity that operates the service, shown in the Terms and Privacy pages. */
  legalEntity: import.meta.env.VITE_LEGAL_ENTITY || 'DeskZeal',
  /** Where customers reach a human. Contact links are hidden until this is set. */
  supportEmail: (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || '',
  /** Shown on legal pages; bump it whenever the text changes. */
  legalLastUpdated: 'October 11, 2026',
} as const
