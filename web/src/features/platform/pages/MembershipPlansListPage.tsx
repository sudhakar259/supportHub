import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import type { DataTableColumn } from '@/components/tables/DataTable'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { PlanFormModal } from '@/features/platform/components/PlanFormModal'
import { platformMembershipPlansApi } from '@/features/platform/api/platformMembershipPlansApi'
import type { MembershipPlan } from '@/features/tenants/types'
import { formatPriceCents } from '@/utils/money'

export function MembershipPlansListPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)

  function load() {
    setIsLoading(true)
    setError(null)
    platformMembershipPlansApi
      .list()
      .then(setPlans)
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }

  useEffect(load, [])

  function openCreate() {
    setEditingPlan(null)
    setIsFormOpen(true)
  }

  function openEdit(plan: MembershipPlan) {
    setEditingPlan(plan)
    setIsFormOpen(true)
  }

  const columns: DataTableColumn<MembershipPlan>[] = [
    { key: 'name', header: 'Plan', render: (p) => <span className="font-bold text-on-surface">{p.name}</span> },
    { key: 'slug', header: 'Slug', render: (p) => <span className="font-code-sm text-code-sm text-secondary">{p.slug}</span> },
    { key: 'price', header: 'Price', render: (p) => `${formatPriceCents(p.priceCents, p.currency)} / ${p.billingInterval}` },
    { key: 'status', header: 'Status', render: (p) => (p.isActive ? <Badge tone="tertiary">Active</Badge> : <Badge tone="neutral">Inactive</Badge>) },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right whitespace-nowrap',
      render: (p) => <IconButton icon="edit" label="Edit plan" onClick={() => openEdit(p)} />,
    },
  ]

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Membership Plans' }]}
        title="Membership Plans"
        meta={<span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary">{plans.length} total</span>}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-space-sm rounded bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Icon name="add" size={18} />
            Create Plan
          </button>
        }
      />

      <div className="px-gutter-lg">
        <DataTable columns={columns} rows={plans} getRowId={(p) => String(p.id)} isLoading={isLoading} error={error} onRetry={load} emptyTitle="No membership plans found" />
      </div>

      <PlanFormModal
        isOpen={isFormOpen}
        plan={editingPlan}
        onClose={() => setIsFormOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
