const RESERVED_SLUGS = new Set(['www', 'api', 'app', 'admin', 'platform', 'mail', 'smtp', 'status', 'docs', 'cdn', 'assets', 'support', 'demo'])

export function isWorkspaceSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) && !RESERVED_SLUGS.has(slug)
}

export function workspaceDomain(hostname = window.location.hostname): string | null {
  const configured = (import.meta.env.VITE_WORKSPACE_DOMAIN as string | undefined)?.trim().toLowerCase().replace(/^\.+|\.+$/g, '')
  if (configured) return configured
  return hostname === 'localhost' || hostname.endsWith('.localhost') ? 'localhost' : null
}

export function workspaceSlug(hostname = window.location.hostname, domain = workspaceDomain(hostname)): string | null {
  if (!domain || !hostname.toLowerCase().endsWith(`.${domain}`)) return null
  const slug = hostname.toLowerCase().slice(0, -(domain.length + 1))
  return isWorkspaceSlug(slug) ? slug : null
}

export function workspaceUrl(slug: string, path = '/login'): string | null {
  const domain = workspaceDomain()
  if (!domain || !isWorkspaceSlug(slug)) return null
  const scheme = domain === 'localhost' ? window.location.protocol : 'https:'
  const port = domain === 'localhost' ? window.location.port : (import.meta.env.VITE_WORKSPACE_PORT as string | undefined)
  return `${scheme}//${slug}.${domain}${port ? `:${port}` : ''}${path}`
}

export function publicSiteUrl(path = '/'): string {
  const domain = workspaceDomain()
  if (!domain || !workspaceSlug()) return path
  const scheme = domain === 'localhost' ? window.location.protocol : 'https:'
  const port = domain === 'localhost' ? window.location.port : (import.meta.env.VITE_WORKSPACE_PORT as string | undefined)
  return `${scheme}//${domain}${port ? `:${port}` : ''}${path}`
}

export function workspaceHeaders(): Record<string, string> {
  const slug = workspaceSlug()
  return slug ? { 'X-Workspace': slug } : {}
}
