import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE } from '@/config/site'
import { workspaceSlug } from '@/features/workspaces/workspace'
import { getSeoMetadata, serializeJsonLd } from '@/seo/pages'

function setMeta(name: string, content: string, property = false) {
  const attribute = property ? 'property' : 'name'
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
  if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, name); document.head.append(element) }
  element.content = content
}

export function Seo() {
  const { pathname } = useLocation()
  useEffect(() => {
    const metadata = getSeoMetadata(pathname, { production: import.meta.env.PROD, hostname: window.location.hostname, tenant: Boolean(workspaceSlug()) })
    document.title = metadata.title
    setMeta('description', metadata.description)
    setMeta('robots', metadata.robots)
    setMeta('og:site_name', SITE.name, true)
    for (const [name, content] of [['title', metadata.title], ['description', metadata.description], ['image', metadata.image]]) {
      setMeta(`og:${name}`, content, true); setMeta(`twitter:${name}`, content)
    }
    setMeta('og:type', metadata.type, true)
    setMeta('og:image:width', '1200', true); setMeta('og:image:height', '630', true)
    setMeta('og:image:alt', 'DeskZeal helpdesk and customer support software', true)
    setMeta('twitter:card', 'summary_large_image')
    document.head.querySelector('link[rel="canonical"]')?.remove()
    document.head.querySelector('meta[property="og:url"]')?.remove()
    document.getElementById('seo-jsonld')?.remove()
    if (metadata.canonical) {
      const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = metadata.canonical; document.head.append(canonical)
      setMeta('og:url', metadata.canonical, true)
    }
    if (metadata.structuredData) {
      const script = document.createElement('script'); script.id = 'seo-jsonld'; script.type = 'application/ld+json'; script.textContent = serializeJsonLd(metadata.structuredData); document.head.append(script)
    }
  }, [pathname])
  return null
}
