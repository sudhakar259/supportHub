import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

import { SITE } from '@/config/site'
import { PublicPageDocument } from '@/seo/PublicPageDocument'
import { PUBLIC_PAGES, getSeoMetadata, renderSeoHead } from '@/seo/pages'

export { PUBLIC_PAGES, SITE }

export function renderPublicPage(path: string) {
  const metadata = getSeoMetadata(path, { production: true, hostname: new URL(SITE.url).hostname })
  return {
    html: renderToString(createElement(PublicPageDocument, { path })),
    head: renderSeoHead(metadata),
  }
}
