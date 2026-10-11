import { useEffect, useState } from 'react'

import type { DataTableColumn } from '@/components/tables/DataTable'
import { DataTable } from '@/components/tables/DataTable'
import { Pagination } from '@/components/tables/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { useToast } from '@/components/feedback/ToastProvider'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { CreateUserModal } from '@/features/users/components/CreateUserModal'
import { EditUserModal } from '@/features/users/components/EditUserModal'
import { usersApi } from '@/features/users/api/usersApi'
import { useUsers } from '@/features/users/hooks/useUsers'
import type { UserFilters } from '@/features/users/types'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { hasPermission } from '@/types/user'
import type { User } from '@/types/user'

const PER_PAGE = 20

export function UsersListPage() {
  const { user: currentUser, startImpersonation, impersonator } = useAuth()
  const toast = useToast()
  const canCreate = hasPermission(currentUser, 'users.create')
  const canUpdate = hasPermission(currentUser, 'users.update')
  const canDelete = hasPermission(currentUser, 'users.delete')
  const canImpersonate = hasPermission(currentUser, 'users.impersonate') && !impersonator
  const [filters, setFilters] = useState<UserFilters>({ page: 1, perPage: PER_PAGE, sort: 'name' })
  const [nameInput, setNameInput] = useState('')
  const debouncedName = useDebouncedValue(nameInput, 300)
  // Previously fired one API request per keystroke (QA finding, 2026-10-01).
  useEffect(() => {
    setFilters((f) => (f.name === debouncedName ? f : { ...f, name: debouncedName || undefined, page: 1 }))
  }, [debouncedName])
  const { users, meta, isLoading, error, refetch } = useUsers(filters)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  const columns: DataTableColumn<User>[] = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={u.name} src={u.avatarPath} size={32} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-title-sm font-semibold">{u.name}</span>
            <span className="truncate text-[11px] text-secondary">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (u.roles[0] ? <Badge tone="secondary">{u.roles[0]}</Badge> : <span className="text-secondary">—</span>),
    },
    {
      key: 'departments',
      header: 'Departments',
      render: (u) => (u.departments.length ? u.departments.map((d) => d.name).join(', ') : <span className="text-secondary">—</span>),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) =>
        u.isActive ? (
          <Badge tone="tertiary">Active</Badge>
        ) : (
          <Badge tone="danger">Inactive</Badge>
        ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      className: 'text-[12px] text-secondary whitespace-nowrap',
      render: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never'),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right whitespace-nowrap',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          {canImpersonate && u.id !== currentUser?.id && !u.roles.includes('Administrator') && u.isActive && (
            <IconButton
              icon="login"
              label={`Login as ${u.name}`}
              onClick={() =>
                startImpersonation(u.id).catch((err: unknown) =>
                  toast.error('Login As Failed', err instanceof Error ? err.message : 'Could not switch to this user.'),
                )
              }
            />
          )}
          {canUpdate && <IconButton icon="edit" label="Edit user" onClick={() => setEditingUser(u)} />}
          {canDelete && <IconButton icon="delete" label="Delete user" onClick={() => setDeletingUser(u)} />}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Governance' }, { label: 'Users' }]}
        title="Users"
        meta={meta && <span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary">{meta.total} total</span>}
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-9 items-center gap-space-sm rounded bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            >
              <Icon name="person_add" size={18} />
              Create User
            </button>
          )
        }
      />

      <div className="px-gutter-lg">
        <div className="mb-space-md flex items-center gap-space-sm">
          <input
            type="text"
            placeholder="Search by name…"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="h-9 w-64 rounded-lg bg-surface-container-lowest px-space-md text-body-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <DataTable
          columns={columns}
          rows={users}
          getRowId={(u) => String(u.id)}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          emptyTitle="No users found"
        />
        {meta && <Pagination meta={meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />}
      </div>

      <CreateUserModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={refetch} />
      <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onUpdated={refetch} />
      {deletingUser && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeletingUser(null)}
          title="Deactivate User"
          description={`This will deactivate ${deletingUser.name} and revoke their active sessions. This can be reversed by an administrator later.`}
          confirmLabel="Deactivate"
          successMessage={`${deletingUser.name} deactivated.`}
          onConfirm={async () => {
            await usersApi.destroy(deletingUser.id)
            refetch()
          }}
        />
      )}
    </div>
  )
}
