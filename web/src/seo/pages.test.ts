import { describe, expect, it } from 'vitest'
import { getSeoMetadata, PUBLIC_PAGES, renderSeoHead, serializeJsonLd } from '@/seo/pages'

describe('public and workspace SEO boundaries', () => {
  it('indexes published product pages with canonical metadata and breadcrumb data', () => {
    const metadata = getSeoMetadata('/features/email-ticketing/', { production: true, hostname: 'desknu.com' })
    expect(metadata.robots).toContain('index, follow')
    expect(metadata.canonical).toBe('https://desknu.com/features/email-ticketing')
    expect(metadata.description).toContain('Mailgun')
    const graph = metadata.structuredData?.['@graph'] as Record<string, unknown>[]
    expect(graph.some((item) => item['@type'] === 'BreadcrumbList')).toBe(true)
    expect(graph.some((item) => item['@type'] === 'SoftwareApplication')).toBe(false)
    expect(renderSeoHead(metadata)).toContain('property="og:image"')
  })

  it('gives guides article metadata without inventing ratings or prices', () => {
    const metadata = getSeoMetadata('/resources/helpdesk-sla-guide', { production: true, hostname: 'www.desknu.com' })
    expect(metadata.type).toBe('article')
    expect(metadata.canonical).toBe('https://desknu.com/resources/helpdesk-sla-guide')
    expect(JSON.stringify(metadata.structuredData)).not.toMatch(/aggregateRating|offers/)
  })

  it.each(['/login', '/register', '/tickets/123', '/dashboard', '/platform/dashboard', '/features/missing'])('keeps %s out of search and the sitemap', (path) => {
    const metadata = getSeoMetadata(path, { production: true, hostname: 'desknu.com' })
    expect(metadata.robots).toBe('noindex, follow')
    expect(metadata.canonical).toBeNull()
    expect(metadata.structuredData).toBeNull()
    expect(PUBLIC_PAGES[path]).toBeUndefined()
  })

  it('does not index a tenant homepage even though its path matches a public page', () => {
    const metadata = getSeoMetadata('/', { production: true, hostname: 'crevol.desknu.com', tenant: true })
    expect(metadata.robots).toBe('noindex, follow')
    expect(metadata.canonical).toBeNull()
    expect(metadata.title).toBe('Workspace | DeskNu')
  })

  it('does not index local development or an unrelated staging host', () => {
    expect(getSeoMetadata('/', { production: false, hostname: 'desknu.com' }).robots).toBe('noindex, follow')
    expect(getSeoMetadata('/', { production: true, hostname: 'staging.example.com' }).robots).toBe('noindex, follow')
  })

  it('escapes JSON-LD script terminators and HTML attribute content', () => {
    expect(serializeJsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain('<')
    const head = renderSeoHead({ ...getSeoMetadata('/', { production: true, hostname: 'desknu.com' }), description: 'A "quote" & <tag>' })
    expect(head).toContain('A &quot;quote&quot; &amp; &lt;tag&gt;')
  })
})
