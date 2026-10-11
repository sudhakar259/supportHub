import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8')
const design = readFileSync(resolve(__dirname, '../../design/solar_navy_enterprise/DESIGN.md'), 'utf8')

/** role -> { size, lineHeight } in px, from the @utility text-* blocks of the stylesheet. */
function stylesheetScale(): Record<string, { size: number; lineHeight: number }> {
  const scale: Record<string, { size: number; lineHeight: number }> = {}
  for (const m of css.matchAll(/@utility text-([a-z-]+) \{([^}]*)\}/g)) {
    const size = /font-size:\s*(\d+)px/.exec(m[2])
    const lineHeight = /line-height:\s*(\d+)px/.exec(m[2])
    if (size && lineHeight) scale[m[1]] = { size: Number(size[1]), lineHeight: Number(lineHeight[1]) }
  }
  return scale
}

/** The same roles from the design file's `typography:` block. */
function designScale(): Record<string, { size: number; lineHeight: number }> {
  const block = design.split('typography:')[1].split('rounded:')[0]
  const scale: Record<string, { size: number; lineHeight: number }> = {}
  for (const m of block.matchAll(/^ {2}([a-z-]+):\n((?: {4}.+\n)+)/gm)) {
    const size = /fontSize:\s*(\d+)px/.exec(m[2])
    const lineHeight = /lineHeight:\s*(\d+)px/.exec(m[2])
    if (size && lineHeight) scale[m[1]] = { size: Number(size[1]), lineHeight: Number(lineHeight[1]) }
  }
  return scale
}

describe('type scale', () => {
  const scale = stylesheetScale()

  it('has every tier the components use', () => {
    for (const role of ['display-lg', 'headline-lg', 'headline-md', 'headline-sm', 'title-md', 'title-sm', 'body-lg', 'body-md', 'body-sm', 'label-md', 'label-sm', 'code-sm']) {
      expect(scale[role], role).toBeDefined()
    }
  })

  it('never sets text below 13px, so workspace pages read as well as the public site', () => {
    const tooSmall = Object.entries(scale).filter(([, v]) => v.size < 13).map(([k, v]) => `${k}: ${v.size}px`)
    expect(tooSmall).toEqual([])
  })

  it('keeps body text readable: 16px body, 14px dense text', () => {
    expect(scale['body-md'].size).toBeGreaterThanOrEqual(16)
    expect(scale['body-sm'].size).toBeGreaterThanOrEqual(14)
    expect(scale['label-md'].size).toBeGreaterThanOrEqual(14)
  })

  it('gives reading text (body, label, title, code) a line height of at least 1.3x', () => {
    // Large headings are deliberately tighter, so they are not held to this.
    const cramped = Object.entries(scale)
      .filter(([role, v]) => /^(body|label|title|code)-/.test(role) && v.lineHeight / v.size < 1.3)
      .map(([k]) => k)
    expect(cramped).toEqual([])
  })

  it('keeps the sizes ordered: a bigger tier is never smaller than a smaller one', () => {
    const order = ['label-sm', 'label-md', 'body-sm', 'title-sm', 'body-md', 'title-md', 'body-lg', 'headline-sm', 'headline-md', 'headline-lg', 'display-lg']
    const sizes = order.map((r) => scale[r].size)
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b))
  })

  it('matches the design file for every role', () => {
    const wanted = designScale()
    expect(Object.keys(wanted).length).toBeGreaterThan(8)
    for (const [role, value] of Object.entries(wanted)) {
      if (scale[role]) expect(scale[role], role).toEqual(value)
    }
  })
})
