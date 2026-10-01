import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { SelectField } from '@/components/ui/SelectField'
import { departmentsApi } from '@/features/departments/api/departmentsApi'
import { DepartmentFormModal } from '@/features/departments/components/DepartmentFormModal'
import { usersApi } from '@/features/users/api/usersApi'
import { fetchOrDefault } from '@/utils/fetchOrDefault'
import type { Department } from '@/types/department'
import type { User } from '@/types/user'

export function DepartmentDetailsPage() {
  const { departmentId } = useParams<{ departmentId: string }>()
  const id = Number(departmentId)
  const toast = useToast()

  const [department, setDepartment] = useState<Department | null>(null)
  const [allStaff, setAllStaff] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [newMemberId, setNewMemberId] = useState<number | ''>('')
  const [isMutating, setIsMutating] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    // There's no "list members of department X" endpoint — UserResource includes each
    // user's departments, so membership is derived client-side from the user list.
    const emptyUsersPage = { items: [] as User[], meta: { currentPage: 1, lastPage: 1, perPage: 100, total: 0 } }
    Promise.all([departmentsApi.get(id), fetchOrDefault(usersApi.list({ perPage: 100 }), emptyUsersPage)])
      .then(([dept, usersPage]) => {
        setDepartment(dept)
        setAllStaff(usersPage.items)
      })
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [id, reloadToken])

  const members = useMemo(() => allStaff.filter((u) => u.departments.some((d) => d.id === id)), [allStaff, id])
  const nonMembers = useMemo(() => allStaff.filter((u) => !u.departments.some((d) => d.id === id)), [allStaff, id])

  async function handleAddMember() {
    if (!newMemberId) return
    const member = allStaff.find((u) => u.id === Number(newMemberId))
    setIsMutating(true)
    try {
      await departmentsApi.assignUser(id, Number(newMemberId))
      toast.success('Member Added', `${member?.name ?? 'Staff member'} added to ${department?.name ?? 'the department'}.`)
      setNewMemberId('')
      setReloadToken((t) => t + 1)
    } catch (err) {
      toast.error('Failed to Add Member', err instanceof Error ? err.message : undefined)
    } finally {
      setIsMutating(false)
    }
  }

  async function handleRemoveMember(userId: number) {
    const member = allStaff.find((u) => u.id === userId)
    setIsMutating(true)
    try {
      await departmentsApi.removeUser(id, userId)
      toast.success('Member Removed', `${member?.name ?? 'Staff member'} removed from ${department?.name ?? 'the department'}.`)
      setReloadToken((t) => t + 1)
    } catch (err) {
      toast.error('Failed to Remove Member', err instanceof Error ? err.message : undefined)
    } finally {
      setIsMutating(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading department…" />
  if (error || !department) return <ErrorState description={error?.message ?? 'Department not found.'} />

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Departments', to: ROUTES.departments }, { label: department.name }]}
        title={department.name}
        meta={
          <div className="flex items-center gap-space-sm">
            <span className="font-code-sm text-code-sm text-secondary">{department.code}</span>
            {department.isActive ? <Badge tone="tertiary">Active</Badge> : <Badge tone="danger">Inactive</Badge>}
          </div>
        }
        actions={
          <Button variant="ghost" leadingIcon="edit" onClick={() => setIsEditOpen(true)}>
            Edit Department
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-space-md px-gutter-lg sm:grid-cols-3">
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <span className="text-label-sm uppercase text-secondary">Manager</span>
          <div className="mt-1 flex items-center gap-2">
            {department.manager ? (
              <>
                <Avatar name={department.manager.name} src={department.manager.avatarPath} size={28} />
                <span className="text-title-sm font-semibold text-on-surface">{department.manager.name}</span>
              </>
            ) : (
              <span className="text-body-sm text-on-surface-variant">No manager assigned</span>
            )}
          </div>
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <span className="text-label-sm uppercase text-secondary">Agents</span>
          <div className="text-headline-md text-on-surface">{department.agentsCount ?? 0}</div>
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <span className="text-label-sm uppercase text-secondary">Tickets</span>
          <div className="text-headline-md text-on-surface">{department.ticketsCount ?? 0}</div>
        </div>
      </div>

      {department.description && (
        <div className="px-gutter-lg">
          <p className="rounded-xl bg-surface-container-lowest p-space-md text-body-sm text-on-surface-variant shadow-sm">{department.description}</p>
        </div>
      )}

      <div className="px-gutter-lg">
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <div className="mb-space-sm flex items-center justify-between">
            <span className="text-title-sm font-bold text-on-surface">Members ({members.length})</span>
            <div className="flex items-center gap-2">
              <SelectField value={newMemberId} onChange={(e) => setNewMemberId(e.target.value ? Number(e.target.value) : '')} containerClassName="w-56" className="h-9">
                <option value="">Add a staff member…</option>
                {nonMembers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </SelectField>
              <Button size="sm" leadingIcon="person_add" disabled={!newMemberId} isLoading={isMutating} onClick={handleAddMember}>
                Add
              </Button>
            </div>
          </div>

          {members.length === 0 ? (
            <p className="py-space-md text-center text-body-sm text-on-surface-variant">No members yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-surface-container-low">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-space-sm">
                  <div className="flex items-center gap-space-sm">
                    <Avatar name={member.name} src={member.avatarPath} size={32} />
                    <div className="flex flex-col">
                      <span className="text-title-sm font-semibold text-on-surface">{member.name}</span>
                      <span className="text-body-sm text-secondary">{member.roles[0] ?? 'Staff'}</span>
                    </div>
                  </div>
                  <IconButton icon="person_remove" label="Remove from department" onClick={() => handleRemoveMember(member.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DepartmentFormModal
        isOpen={isEditOpen}
        department={department}
        onClose={() => setIsEditOpen(false)}
        onSaved={(updated) => {
          setDepartment(updated)
          setIsEditOpen(false)
        }}
      />
    </div>
  )
}
