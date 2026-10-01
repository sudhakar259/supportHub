import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import type { DataTableColumn } from '@/components/tables/DataTable'
import { DataTable } from '@/components/tables/DataTable'
import { Pagination } from '@/components/tables/Pagination'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { DepartmentFormModal } from '@/features/departments/components/DepartmentFormModal'
import { departmentsApi } from '@/features/departments/api/departmentsApi'
import { useDepartments } from '@/features/departments/hooks/useDepartments'
import type { DepartmentFilters } from '@/features/departments/types'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'
import type { Department } from '@/types/department'

export function DepartmentsListPage() {
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'departments.create')
  const canUpdate = hasPermission(user, 'departments.update')
  const canDelete = hasPermission(user, 'departments.delete')
  const [filters, setFilters] = useState<DepartmentFilters>({ page: 1, perPage: 20, sort: 'name' })
  const { departments, meta, isLoading, error, refetch } = useDepartments(filters)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null)

  function openCreate() {
    setEditingDepartment(null)
    setIsFormOpen(true)
  }

  function openEdit(department: Department) {
    setEditingDepartment(department)
    setIsFormOpen(true)
  }

  const columns: DataTableColumn<Department>[] = [
    {
      key: 'name',
      header: 'Department',
      render: (d) => (
        <Link to={ROUTES.departmentDetails(d.id)} className="font-bold text-on-surface hover:text-primary">
          {d.name}
        </Link>
      ),
    },
    { key: 'code', header: 'Code', render: (d) => <span className="font-code-sm text-code-sm text-secondary">{d.code}</span> },
    { key: 'manager', header: 'Manager', render: (d) => d.manager?.name ?? <span className="text-secondary">—</span> },
    { key: 'agents', header: 'Agents', render: (d) => d.agentsCount ?? 0 },
    { key: 'tickets', header: 'Tickets', render: (d) => d.ticketsCount ?? 0 },
    { key: 'status', header: 'Status', render: (d) => (d.isActive ? <Badge tone="tertiary">Active</Badge> : <Badge tone="danger">Inactive</Badge>) },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right whitespace-nowrap',
      render: (d) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && <IconButton icon="edit" label="Edit department" onClick={() => openEdit(d)} />}
          {canDelete && <IconButton icon="delete" label="Delete department" onClick={() => setDeletingDepartment(d)} />}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Departments' }]}
        title="Departments"
        meta={meta && <span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary">{meta.total} total</span>}
        actions={
          canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-9 items-center gap-space-sm rounded bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            >
              <Icon name="add" size={18} />
              Create Department
            </button>
          )
        }
      />

      <div className="px-gutter-lg">
        <DataTable columns={columns} rows={departments} getRowId={(d) => String(d.id)} isLoading={isLoading} error={error} onRetry={refetch} emptyTitle="No departments found" />
        {meta && <Pagination meta={meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />}
      </div>

      <DepartmentFormModal
        isOpen={isFormOpen}
        department={editingDepartment}
        onClose={() => setIsFormOpen(false)}
        onSaved={refetch}
      />
      {deletingDepartment && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeletingDepartment(null)}
          title="Delete Department"
          description={`Delete "${deletingDepartment.name}"? Existing tickets keep their department reference for historical reporting.`}
          successMessage={`"${deletingDepartment.name}" deleted.`}
          onConfirm={async () => {
            await departmentsApi.destroy(deletingDepartment.id)
            refetch()
          }}
        />
      )}
    </div>
  )
}
