import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Production builds only: the dev server needs inline scripts for React Fast Refresh.
// frame-ancestors is ignored in a meta tag; the API sends it as a header.
function contentSecurityPolicy(apiUrl: string): Plugin {
  const apiOrigin = new URL(apiUrl).origin

  return {
    name: 'supporthub-content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      // Razorpay Checkout loads its script, assets and payment frame from *.razorpay.com.
      const policy = [
        "default-src 'self'",
        "script-src 'self' https://*.razorpay.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https://*.razorpay.com",
        `connect-src 'self' ${apiOrigin} https://*.razorpay.com`,
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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiUrl = env.VITE_API_URL || 'http://localhost:8000/api/v1'

  return {
    plugins: [react(), tailwindcss(), contentSecurityPolicy(apiUrl)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
