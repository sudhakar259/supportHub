import { afterEach, describe, expect, it, vi } from 'vitest'

import { isWorkspaceSlug, publicSiteUrl, workspaceDomain, workspaceHeaders, workspaceSlug, workspaceUrl } from './workspace'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('tenant workspace addresses', () => {
  it('recognizes only one valid tenant label under the configured domain', () => {
    expect(workspaceSlug('crevol.deskzeal.com', 'deskzeal.com')).toBe('crevol')
    for (const host of ['deskzeal.com', 'api.deskzeal.com', 'www.deskzeal.com', 'a.crevol.deskzeal.com', 'crevol.deskzeal.com.attacker.test']) {
      expect(workspaceSlug(host, 'deskzeal.com')).toBeNull()
    }
  })

  it('rejects infrastructure names and DNS-invalid workspace IDs', () => {
    for (const slug of ['api', 'www', 'admin', 'under_score', '-team', 'team-', 'Uppercase', 'a'.repeat(64)]) expect(isWorkspaceSlug(slug)).toBe(false)
    for (const slug of ['crevol', 'team-1', 'a', 'a'.repeat(63)]) expect(isWorkspaceSlug(slug)).toBe(true)
  })

  it('uses HTTPS and the configured parent domain in production', () => {
    vi.stubEnv('VITE_WORKSPACE_DOMAIN', 'deskzeal.com')
    vi.stubGlobal('window', { location: { hostname: 'deskzeal.com', protocol: 'https:', port: '' } })
    expect(workspaceUrl('crevol')).toBe('https://crevol.deskzeal.com/login')
    expect(workspaceUrl('api')).toBeNull()
    expect(workspaceHeaders()).toEqual({})
  })

  it('keeps the local server port when opening a tenant workspace', () => {
    vi.stubEnv('VITE_WORKSPACE_DOMAIN', '')
    vi.stubGlobal('window', { location: { hostname: 'localhost', protocol: 'http:', port: '5173' } })
    expect(workspaceDomain()).toBe('localhost')
    expect(workspaceUrl('crevol', '/')).toBe('http://crevol.localhost:5173/')
  })

  it('sends the workspace header only from a tenant host and links marketing back to the root', () => {
    vi.stubEnv('VITE_WORKSPACE_DOMAIN', 'deskzeal.com')
    vi.stubGlobal('window', { location: { hostname: 'crevol.deskzeal.com', protocol: 'https:', port: '' } })
    expect(workspaceHeaders()).toEqual({ 'X-Workspace': 'crevol' })
    expect(publicSiteUrl('/register')).toBe('https://deskzeal.com/register')
  })

  it('preserves a deployment on a single domain when workspace domains are not enabled', () => {
    vi.stubEnv('VITE_WORKSPACE_DOMAIN', '')
    vi.stubGlobal('window', { location: { hostname: 'legacy.example.test', protocol: 'https:', port: '' } })
    expect(workspaceDomain()).toBeNull()
    expect(workspaceUrl('crevol')).toBeNull()
    expect(publicSiteUrl('/register')).toBe('/register')
  })
})
