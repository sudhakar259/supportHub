import { afterEach, describe, expect, it } from 'vitest'

import { applyBrand } from '@/features/branding/theme'

afterEach(() => applyBrand(null))

describe('applyBrand', () => {
  it('sets each shade as a theme variable', () => {
    applyBrand({ primary: '#0f766e', on_primary: '#ffffff', primary_fixed_dim: '#99f6e4' })

    const style = document.documentElement.style
    expect(style.getPropertyValue('--color-primary')).toBe('#0f766e')
    expect(style.getPropertyValue('--color-on-primary')).toBe('#ffffff')
    expect(style.getPropertyValue('--color-primary-fixed-dim')).toBe('#99f6e4')
  })

  it('puts the default theme back when there is no brand colour', () => {
    applyBrand({ primary: '#0f766e' })
    applyBrand(null)

    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('')
  })

  it('drops shades the next palette no longer sets', () => {
    applyBrand({ primary: '#0f766e', surface_tint: '#0f766e' })
    applyBrand({ primary: '#1d4ed8' })

    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#1d4ed8')
    expect(document.documentElement.style.getPropertyValue('--color-surface-tint')).toBe('')
  })
})
