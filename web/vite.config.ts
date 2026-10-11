import { fileURLToPath, URL } from 'node:url'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Production builds only: the dev server needs inline scripts for React Fast Refresh.
// frame-ancestors is ignored in a meta tag; the API sends it as a header.
function contentSecurityPolicy(apiUrl: string, errorReportingDsn = ''): Plugin {
  const apiOrigin = new URL(apiUrl).origin
  // Only when error reporting is configured: the origin of the Sentry host named in the DSN.
  const errorReportingOrigin = errorReportingDsn ? ` ${new URL(errorReportingDsn).origin}` : ''

  return {
    name: 'desknu-content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      // Razorpay Checkout loads its script, assets and payment frame from *.razorpay.com.
      const policy = [
        "default-src 'self'",
        "script-src 'self' https://*.razorpay.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https://*.razorpay.com",
        `connect-src 'self' ${apiOrigin}${errorReportingOrigin} https://*.razorpay.com`,
        "frame-src https://*.razorpay.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')

      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// Match the production public/tenant split when reviewing the built site locally.
function publicPagePreview(siteUrl: string): Plugin {
  return {
    name: 'desknu-public-page-preview',
    async configurePreviewServer(server) {
      const dist = resolve(server.config.root, server.config.build.outDir)
      const paths: string[] = JSON.parse(await readFile(resolve(dist, 'public-routes.json'), 'utf8'))
      const rootHost = new URL(siteUrl).hostname
      server.middlewares.use(async (request, response, next) => {
        if (request.method !== 'GET' && request.method !== 'HEAD') return next()
        const url = new URL(request.url || '/', 'http://localhost')
        const path = url.pathname.replace(/\/+$/, '') || '/'
        const host = (request.headers.host || '').split(':')[0].toLowerCase()
        const publicHost = ['localhost', '127.0.0.1', rootHost, `www.${rootHost}`].includes(host)
        let file: string | null = null
        if (path === '/robots.txt') file = publicHost ? 'robots.txt' : 'tenant-robots.txt'
        else if (path === '/sitemap.xml' && !publicHost) {
          response.statusCode = 404
          response.end()
          return
        } else if (path.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(path)) return next()
        else file = publicHost && paths.includes(path) ? (path === '/' ? 'index.html' : `${path.slice(1)}/index.html`) : 'app.html'
        try {
          const html = await readFile(resolve(dist, file))
          response.setHeader('Content-Type', file.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'text/html; charset=utf-8')
          response.setHeader('Cache-Control', 'no-cache')
          response.end(request.method === 'HEAD' ? undefined : html)
        } catch (error) { next(error) }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000/api/v1'

  return {
    // Browsers resolve *.localhost to IPv4 loopback, enabling local tenant URLs.
    server: { host: '127.0.0.1' },
    preview: { host: '127.0.0.1' },
    plugins: [react(), tailwindcss(), contentSecurityPolicy(apiUrl, env.VITE_SENTRY_DSN), publicPagePreview(env.VITE_SITE_URL || 'https://desknu.com')],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
