import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

const dist = resolve('dist')
const pages = JSON.parse(await readFile(resolve(dist, 'public-routes.json'), 'utf8'))
const sitemap = await readFile(resolve(dist, 'sitemap.xml'), 'utf8')
const titles = new Set()
const descriptions = new Set()
for (const path of pages) {
  const html = await readFile(resolve(dist, path === '/' ? 'index.html' : `${path.slice(1)}/index.html`), 'utf8')
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${path}: one visible main heading`)
  assert.match(html, /<meta name="robots" content="index, follow, max-image-preview:large"/)
  assert.match(html, /<script id="seo-jsonld" type="application\/ld\+json">/)
  assert.doesNotMatch(html, /SupportHub|Support24/)
  assert.match(html, /type="image\/png" href="\/favicon.png"/)
  assert.match(html, /\/branding\/deskNu-logo.png/)
  const title = html.match(/<title>(.*?)<\/title>/)?.[1]
  const description = html.match(/<meta name="description" content="(.*?)"/)?.[1]
  assert.ok(title && description, `${path}: search metadata`)
  assert.ok(!titles.has(title), `${path}: unique title`)
  assert.ok(!descriptions.has(description), `${path}: unique description`)
  titles.add(title); descriptions.add(description)
  const canonical = html.match(/<link rel="canonical" href="(.*?)"/)?.[1]
  assert.ok(canonical && sitemap.includes(`<loc>${canonical}</loc>`), `${path}: canonical included in sitemap`)
}
const app = await readFile(resolve(dist, 'app.html'), 'utf8')
assert.match(app, /<div id="root"><\/div>/)
assert.match(app, /noindex, follow/)
assert.doesNotMatch(app, /rel="canonical"|seo-jsonld/)
assert.doesNotMatch(sitemap, /\/login|\/register|\/dashboard|\/tickets|\/platform/)
assert.equal(await readFile(resolve(dist, 'tenant-robots.txt'), 'utf8'), 'User-agent: *\nDisallow: /\n')
for (const file of ['social-card.png', 'brand-mark.png', 'apple-touch-icon.png', 'favicon.png', 'branding/deskNu-logo.png', 'branding/light-mode-desknu-logo.png']) {
  const png = await readFile(resolve(dist, file))
  assert.equal(png.subarray(1, 4).toString(), 'PNG', `${file}: valid image export`)
}
const source = await readFile(resolve(dist, 'hosting/cloudfront-routing.js'), 'utf8')
const handler = runInNewContext(`${source}\nhandler;`)
const root = source.match(/var root = "([^"]+)"/)[1]
function route(host, uri) {
  return handler({ request: { uri, headers: { host: { value: host } }, querystring: { plan: { value: 'professional' } } } })
}
assert.equal(route(root, '/features/email-ticketing/').uri, '/features/email-ticketing/index.html')
assert.equal(route(root, '/register').uri, '/app.html')
assert.equal(route(`crevol.${root}`, '/').uri, '/app.html')
assert.equal(route(`crevol.${root}`, '/features/ticketing').uri, '/app.html')
assert.equal(route(`crevol.${root}`, '/robots.txt').uri, '/tenant-robots.txt')
assert.equal(route(`crevol.${root}`, '/sitemap.xml').statusCode, 404)
assert.equal(route(root, '/assets/app.js').uri, '/assets/app.js')
assert.equal(route(root, '/missing-page').uri, '/app.html')
assert.equal(route(root, '/register').querystring.plan.value, 'professional')
console.log(`Verified ${pages.length} rendered pages, unique metadata, sitemap, images and public/tenant hosting routes.`)
