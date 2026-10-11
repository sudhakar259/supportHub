import { useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { brandingApi } from '@/features/branding/brandingApi'
import { ApiError } from '@/types/api'
import { hasPermission } from '@/types/user'

const DEFAULT_PRIMARY = '#a33900'
const DEFAULT_SIDEBAR = '#213145'
const HEX = /^#[0-9a-f]{6}$/i

interface ColorRowProps {
  label: string
  help: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  preview: React.ReactNode
}

function ColorRow({ label, help, value, onChange, disabled, preview }: ColorRowProps) {
  const valid = HEX.test(value)
  return (
    <div className="flex flex-col gap-space-sm">
      <div>
        <h3 className="text-title-sm font-bold text-on-surface">{label}</h3>
        <p className="text-body-sm text-on-surface-variant">{help}</p>
      </div>
      <div className="flex flex-wrap items-end gap-space-md">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : '#000000'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-16 cursor-pointer rounded bg-transparent disabled:cursor-not-allowed"
        />
        <label className="flex flex-col gap-1 text-label-md text-on-surface-variant">
          {label} hex code
          <input
            value={value}
            disabled={disabled}
            maxLength={7}
            spellCheck={false}
            onChange={(e) => onChange(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
            className="h-10 w-32 rounded-lg bg-surface-container-low px-space-sm font-mono text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          />
        </label>
        {preview}
      </div>
      {value.length > 0 && !valid && <p className="text-body-sm text-on-surface-variant">Enter a six-digit colour such as #0f766e.</p>}
    </div>
  )
}

/** Lets an administrator put their brand colours on the app (and, for the primary one, on emails). */
export function BrandingCard() {
  const toast = useToast()
  const { user, setUser } = useAuth()
  const canManage = hasPermission(user, 'settings.manage')
  const brand = user?.tenant?.brand ?? null
  const savedPrimary = brand?.primary && brand.primary !== DEFAULT_PRIMARY ? brand.primary : null
  const savedSidebar = brand?.sidebar && brand.sidebar !== DEFAULT_SIDEBAR ? brand.sidebar : null
  const [primary, setPrimary] = useState(savedPrimary ?? DEFAULT_PRIMARY)
  const [sidebar, setSidebar] = useState(savedSidebar ?? DEFAULT_SIDEBAR)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user?.tenant) return null

  const changed = primary.toLowerCase() !== (savedPrimary ?? DEFAULT_PRIMARY) || sidebar.toLowerCase() !== (savedSidebar ?? DEFAULT_SIDEBAR)
  const canSave = HEX.test(primary) && HEX.test(sidebar) && changed

  async function save(colors: { primaryColor?: string | null; sidebarColor?: string | null }, message: string) {
    if (!user?.tenant) return
    setIsSaving(true)
    setError(null)
    try {
      const result = await brandingApi.update(colors)
      setUser({ ...user, tenant: { ...user.tenant, brand: result.palette } })
      setPrimary(result.primaryColor ?? DEFAULT_PRIMARY)
      setSidebar(result.sidebarColor ?? DEFAULT_SIDEBAR)
      toast.success(message)
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldError('primary_color') ?? err.fieldError('sidebar_color') ?? err.message) : 'Unable to reach the server. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-space-lg rounded-xl bg-surface-container-lowest p-space-md shadow-sm" aria-labelledby="branding-title">
      <div className="flex flex-col gap-1">
        <h2 id="branding-title" className="flex items-center gap-2 text-title-md font-bold text-on-surface">
          <Icon name="palette" size={20} className="text-primary" />
          Brand colours
        </h2>
        <p className="max-w-2xl text-body-sm text-on-surface-variant">Make the app look like your organisation. Colours that would make text hard to read are refused.</p>
      </div>

      <ColorRow
        label="Brand colour"
        help="Buttons, links and highlights in the app, and in the emails sent for your workspace. Choose a darker shade so white text stays readable."
        value={primary}
        onChange={setPrimary}
        disabled={!canManage}
        preview={
          <span aria-hidden="true" className="inline-flex h-10 items-center rounded px-space-md text-title-sm font-semibold text-white" style={{ backgroundColor: HEX.test(primary) ? primary : DEFAULT_PRIMARY }}>
            Preview button
          </span>
        }
      />

      <ColorRow
        label="Sidebar colour"
        help="The background of the left-hand menu. It needs to be dark, as the menu text is light."
        value={sidebar}
        onChange={setSidebar}
        disabled={!canManage}
        preview={
          <span aria-hidden="true" className="inline-flex h-10 items-center rounded px-space-md text-title-sm font-semibold" style={{ backgroundColor: HEX.test(sidebar) ? sidebar : DEFAULT_SIDEBAR, color: '#dbe1ff' }}>
            Preview menu
          </span>
        }
      />

      {canManage && (
        <div className="flex flex-wrap items-center gap-space-md">
          <button
            type="button"
            disabled={!canSave || isSaving}
            onClick={() => save({ primaryColor: primary.toLowerCase(), sidebarColor: sidebar.toLowerCase() }, 'Brand colours saved')}
            className="inline-flex h-10 items-center gap-space-sm rounded bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save colours
          </button>
          {(savedPrimary || savedSidebar) && (
            <button type="button" disabled={isSaving} onClick={() => save({ primaryColor: null, sidebarColor: null }, 'Default theme restored')} className="h-10 px-space-sm text-title-sm font-semibold text-primary underline disabled:opacity-50">
              Use default theme
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      )}
    </section>
  )
}
