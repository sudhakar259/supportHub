import type { BrandPalette } from '@/types/user'

const prefix = '--color-'
const applied = new Set<string>()

const cssVariable = (key: string) => prefix + key.replace(/_/g, '-')

/** Paints the app in a workspace's brand colour, or puts the default theme back when there is none. */
export function applyBrand(palette: BrandPalette | null | undefined, root: HTMLElement = document.documentElement): void {
  for (const name of applied) root.style.removeProperty(name)
  applied.clear()

  if (!palette) return

  for (const [key, value] of Object.entries(palette)) {
    const name = cssVariable(key)
    root.style.setProperty(name, value)
    applied.add(name)
  }
}
