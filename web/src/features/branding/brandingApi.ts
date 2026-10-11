import { apiFetch } from '@/services/api/client'
import type { BrandPalette } from '@/types/user'

export interface Branding {
  primaryColor: string | null
  sidebarColor: string | null
  palette: BrandPalette | null
}

interface RawBranding {
  primary_color: string | null
  sidebar_color: string | null
  palette: BrandPalette | null
}

/** Maps to api BrandingController: the colour a workspace uses in its app and its emails. */
export const brandingApi = {
  /** Only the colours given are changed; `null` puts that one back to its default. */
  async update(colors: { primaryColor?: string | null; sidebarColor?: string | null }): Promise<Branding> {
    const body: Record<string, string | null> = {}
    if (colors.primaryColor !== undefined) body.primary_color = colors.primaryColor
    if (colors.sidebarColor !== undefined) body.sidebar_color = colors.sidebarColor
    const raw = await apiFetch<RawBranding>('/branding', { method: 'PUT', body })
    return { primaryColor: raw.primary_color, sidebarColor: raw.sidebar_color, palette: raw.palette }
  },
}
