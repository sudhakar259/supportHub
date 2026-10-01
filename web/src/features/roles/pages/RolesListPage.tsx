import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { CreateRoleModal } from '@/features/roles/components/CreateRoleModal'
import { rolesApi } from '@/features/roles/api/rolesApi'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'
import type { Role } from '@/types/role'

const UNDELETABLE_ROLES = new Set(['Administrator', 'Customer'])

export function RolesListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManage = hasPermission(user, 'roles.manage')
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    setIsLoading(true)
    rolesApi
      .list()
      .then((page) => setRoles(page.items))
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [reloadToken])

  const refetch = () => setReloadToken((t) => t + 1)

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Governance' }, { label: 'Roles & Permissions' }]}
        title="Roles & Permissions"
        actions={
          canManage && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-9 items-center gap-space-sm rounded bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            >
              <Icon name="add_moderator" size={18} />
              Create Role
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-space-md px-gutter-lg sm:grid-cols-2 xl:grid-cols-3">
        {isLoading && <LoadingState label="Loading roles…" />}
        {error && <ErrorState description={error.message} onRetry={refetch} />}
        {!isLoading &&
          !error &&
          roles.map((role) => (
            <div
              key={role.id}
              className="flex cursor-pointer flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md"
              onClick={() => navigate(ROUTES.roleDetails(role.id))}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                  <Icon name="admin_panel_settings" size={22} />
                </div>
                {canManage && !UNDELETABLE_ROLES.has(role.name) && (
                  <IconButton
                    icon="delete"
                    label="Delete role"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingRole(role)
                    }}
                  />
                )}
              </div>
              <div>
                <h3 className="text-title-md font-bold text-on-surface">{role.name}</h3>
                <p className="text-body-sm text-on-surface-variant">
                  {role.permissions.length === 0 ? 'No permissions' : `${role.permissions.length} permissions`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-label-sm text-secondary">
                <Icon name="group" size={14} />
                {role.usersCount ?? 0} user{role.usersCount === 1 ? '' : 's'}
              </div>
            </div>
          ))}
      </div>

      <CreateRoleModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(role) => navigate(ROUTES.roleDetails(role.id))}
      />
      {deletingRole && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeletingRole(null)}
          title="Delete Role"
          description={`Delete the "${deletingRole.name}" role? Users currently holding it will lose the permissions it grants.`}
          successMessage={`"${deletingRole.name}" role deleted.`}
          onConfirm={async () => {
            await rolesApi.destroy(deletingRole.id)
            refetch()
          }}
        />
      )}
    </div>
  )
}
