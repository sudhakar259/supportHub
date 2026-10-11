import { describe, expect, it } from 'vitest'

import { router } from '@/app/router/router'

describe('router safety nets', () => {
  const root = router.routes[0]

  it('has an error screen for pages that crash', () => {
    expect(root.errorElement).toBeTruthy()
  })

  it('ends with one catch-all, so no address falls through to a blank page or a sign-in redirect', () => {
    const wildcards = (root.children ?? []).filter((route) => route.path === '*')

    expect(wildcards).toHaveLength(1)
    expect(root.children?.at(-1)?.path).toBe('*')
  })

  it('no longer sends unknown addresses to a placeholder "coming soon" screen', () => {
    const json = JSON.stringify(router.routes, (_key, value) => (typeof value === 'function' ? value.name : value))

    expect(json).not.toMatch(/ComingSoon/)
  })
})
