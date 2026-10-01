import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { permissionsApi, rolesApi } from '@/features/roles/api/rolesApi'
import type { Permission, Role } from '@/types/role'
import { groupPermissionsByResource } from '@/types/role'

export function RoleDetailsPage() {
  const { roleId } = useParams<{ roleId: string }>()
  const toast = useToast()

  const [role, setRole] = useState<Role | null>(null)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!roleId) return
    setIsLoading(true)
    Promise.all([rolesApi.get(Number(roleId)), permissionsApi.list()])
      .then(([fetchedRole, permissions]) => {
        setRole(fetchedRole)
        setAllPermissions(permissions)
        setSelected(new Set(fetchedRole.permissions))
      })
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [roleId])

  const groups = useMemo(() => groupPermissionsByResource(allPermissions), [allPermissions])

  function togglePermission(name: string) {
    setSaved(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleGroup(group: Permission[], checked: boolean) {
    setSaved(false)
    setSelected((prev) => {
      const next = new Set(prev)
      for (const permission of group) {
        if (checked) next.add(permission.name)
        else next.delete(permission.name)
      }
      return next
    })
  }

  async function handleSave() {
    if (!role) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const updated = await rolesApi.update(role.id, { permissions: [...selected] })
      setRole(updated)
      setSaved(true)
      toast.success('Permissions Saved', `${role.name} now has ${selected.size} permission${selected.size === 1 ? '' : 's'}.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save permissions.'
      setSaveError(message)
      toast.error('Failed to Save Permissions', message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading role…" />
  if (error || !role) return <ErrorState description={error?.message ?? 'Role not found.'} />

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[
          { label: 'Workspace' },
          { label: 'Roles & Permissions', to: ROUTES.rolesAndPermissions },
          { label: role.name },
        ]}
        title={role.name}
        meta={<span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary">{role.usersCount ?? 0} users</span>}
        actions={
          <Button leadingIcon="save" isLoading={isSaving} onClick={handleSave}>
            Save Permissions
          </Button>
        }
      />

      <div className="px-gutter-lg">
        {saveError && <p className="mb-space-sm text-body-sm text-error">{saveError}</p>}
        {saved && <p className="mb-space-sm text-body-sm text-tertiary">Permissions saved.</p>}

        <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          {groups.map((group) => {
            const allChecked = group.permissions.every((p) => selected.has(p.name))
            return (
              <div key={group.resource} className="flex flex-col gap-2 border-b border-surface-container-low py-space-sm last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-title-sm font-bold text-on-surface capitalize">{group.resource.replace(/-/g, ' ')}</span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.permissions, !allChecked)}
                    className="text-label-sm text-primary hover:underline"
                  >
                    {allChecked ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-space-lg gap-y-1.5">
                  {group.permissions.map((permission) => {
                    const action = permission.name.split('.').slice(1).join('.')
                    return (
                      <Checkbox
                        key={permission.name}
                        checked={selected.has(permission.name)}
                        onChange={() => togglePermission(permission.name)}
                        label={action}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
