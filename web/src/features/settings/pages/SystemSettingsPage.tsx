import { useEffect, useMemo, useState } from 'react'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Switch } from '@/components/ui/Switch'
import { InboundEmailCard } from '@/features/settings/components/InboundEmailCard'
import { AddSettingModal } from '@/features/settings/components/AddSettingModal'
import { systemSettingsApi } from '@/features/settings/api/systemSettingsApi'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'
import type { SystemSetting } from '@/types/systemSetting'

function SettingValueEditor({
  setting,
  onSave,
  readOnly,
}: {
  setting: SystemSetting
  onSave: (value: unknown) => Promise<void>
  readOnly: boolean
}) {
  const [value, setValue] = useState(setting.value)
  const [isSaving, setIsSaving] = useState(false)
  const dirty = value !== setting.value

  async function handleSave() {
    setIsSaving(true)
    try {
      await onSave(value)
    } finally {
      setIsSaving(false)
    }
  }

  if (setting.type === 'boolean') {
    return <Switch checked={Boolean(value)} disabled={readOnly} onChange={(e) => onSave(e.target.checked)} />
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
      <input
        type={setting.type === 'integer' ? 'number' : 'text'}
        value={String(value ?? '')}
        disabled={readOnly}
        onChange={(e) => setValue(setting.type === 'integer' ? Number(e.target.value) : e.target.value)}
        className="h-9 w-full min-w-0 rounded-lg bg-surface-container-low px-space-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 sm:w-64"
      />
      {!readOnly && dirty && (
        <IconButton icon={isSaving ? 'progress_activity' : 'check'} label="Save setting" onClick={handleSave} />
      )}
    </div>
  )
}

export function SystemSettingsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const canManage = hasPermission(user, 'settings.manage')
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [isAddOpen, setIsAddOpen] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    systemSettingsApi
      .list()
      .then(setSettings)
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [reloadToken])

  const refetch = () => setReloadToken((t) => t + 1)

  const groups = useMemo(() => {
    const map = new Map<string, SystemSetting[]>()
    for (const setting of settings) {
      const list = map.get(setting.group) ?? []
      list.push(setting)
      map.set(setting.group, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [settings])

  async function saveSetting(setting: SystemSetting, value: unknown) {
    try {
      await systemSettingsApi.upsert([{ key: setting.key, value, type: setting.type, group: setting.group, isPublic: setting.isPublic }])
      toast.success('Setting Updated', `"${setting.key}" has been saved.`)
      refetch()
    } catch (err) {
      toast.error('Failed to Save Setting', err instanceof Error ? err.message : undefined)
    }
  }

  if (isLoading) return <LoadingState label="Loading settings…" />
  if (error) return <ErrorState description={error.message} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Governance' }, { label: 'Settings' }]}
        title="System Settings"
        actions={
          canManage && (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex h-9 items-center gap-space-sm rounded bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            >
              <Icon name="add" size={18} />
              Add Setting
            </button>
          )
        }
      />

      <div className="flex flex-col gap-space-md px-gutter-lg">
        <InboundEmailCard />
        {groups.length === 0 ? (
          <p className="rounded-xl bg-surface-container-lowest p-space-md text-center text-body-sm text-on-surface-variant shadow-sm">
            No settings configured yet. Click &ldquo;Add Setting&rdquo; to create one.
          </p>
        ) : (
          groups.map(([group, groupSettings]) => (
            <div key={group} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
              <h2 className="mb-space-sm text-title-md font-bold text-on-surface capitalize">{group}</h2>
              <div className="flex flex-col divide-y divide-surface-container-low">
                {groupSettings.map((setting) => (
                  <div key={setting.key} className="flex flex-col items-start justify-between gap-space-sm py-space-sm sm:flex-row sm:items-center sm:gap-space-md">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-code-sm break-all text-on-surface">{setting.key}</span>
                      {setting.isPublic && <Badge tone="secondary">Public</Badge>}
                    </div>
                    <SettingValueEditor setting={setting} onSave={(value) => saveSetting(setting, value)} readOnly={!canManage} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <AddSettingModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSaved={refetch} />
    </div>
  )
}
