import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createServer } from 'vite'

const dist = resolve('dist')
const template = await readFile(resolve(dist, 'index.html'), 'utf8')
// Never serve the marketing homepage as the fallback for private or unknown routes.
await writeFile(resolve(dist, 'app.html'), template)
const server = await createServer({ mode: 'production', cacheDir: 'node_modules/.vite-ssg', server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom' })
try {
  const { renderPublicPage, PUBLIC_PAGES, SITE } = await server.ssrLoadModule('/src/seo/render.ts')
  const site = new URL(SITE.url)
  if (site.protocol !== 'https:' || site.pathname !== '/' || site.search || site.hash || site.username || site.password) throw new Error('VITE_SITE_URL must be a bare https origin, e.g. https://desknu.com')
  const paths = Object.keys(PUBLIC_PAGES)
  for (const path of paths) {
    const { html, head } = renderPublicPage(path)
    const page = template.replace(/<!--desknu:seo:start-->[\s\S]*?<!--desknu:seo:end-->/, `<!--desknu:seo:start-->\n    ${head}\n    <!--desknu:seo:end-->`).replace('<div id="root"></div>', `<div id="root">${html}</div>`)
    const target = resolve(dist, path === '/' ? 'index.html' : `${path.slice(1)}/index.html`)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, page)
  }
  await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${site.origin}${path}</loc></url>`).join('\n')}\n</urlset>\n`)
  await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`)
  await writeFile(resolve(dist, 'tenant-robots.txt'), 'User-agent: *\nDisallow: /\n')
  await writeFile(resolve(dist, 'public-routes.json'), JSON.stringify(paths, null, 2) + '\n')
  // Copy this generated function to a CloudFront viewer-request function. See docs/branding-seo.md.
  await mkdir(resolve(dist, 'hosting'), { recursive: true })
  await writeFile(resolve(dist, 'hosting/cloudfront-routing.js'), `function handler(event) {\n  var request = event.request;\n  var host = request.headers.host.value.toLowerCase();\n  var root = ${JSON.stringify(site.hostname)};\n  var publicHost = host === root || host === 'www.' + root;\n  var path = request.uri.replace(/\\/+$/, '') || '/';\n  if (path === '/robots.txt') { request.uri = publicHost ? '/robots.txt' : '/tenant-robots.txt'; return request; }\n  if (path === '/sitemap.xml' && !publicHost) return { statusCode: 404, statusDescription: 'Not Found' };\n  if (path.indexOf('/assets/') === 0 || /\\.(png|svg|ico|woff2?|txt|xml)$/.test(path)) return request;\n  var pages = ${JSON.stringify(paths)};\n  request.uri = publicHost && pages.indexOf(path) !== -1 ? (path === '/' ? '/index.html' : path + '/index.html') : '/app.html';\n  return request;\n}\n`)
  console.log(`Rendered ${paths.length} DeskNu public pages, sitemap, robots policies and a CloudFront routing function.`)
} finally {
  await server.close()
}
