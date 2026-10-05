import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/features/tickets/components/MetricCard'
import { platformMembershipPlansApi } from '@/features/platform/api/platformMembershipPlansApi'
import { platformTenantsApi } from '@/features/platform/api/platformTenantsApi'
import type { TenantStatus } from '@/features/platform/types'

const STATUSES: TenantStatus[] = ['trial', 'active', 'suspended', 'cancelled']

interface DashboardStats {
  byStatus: Record<TenantStatus, number>
  totalTenants: number
  totalPlans: number
  activePlans: number
}

export function PlatformDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  function load() {
    setIsLoading(true)
    setError(null)
    Promise.all([
      Promise.all(STATUSES.map((status) => platformTenantsApi.list({ status, perPage: 1 }))),
      platformMembershipPlansApi.list(),
    ])
      .then(([pages, plans]) => {
        const byStatus = {} as Record<TenantStatus, number>
        STATUSES.forEach((status, i) => {
          byStatus[status] = pages[i].meta.total
        })
        setStats({
          byStatus,
          totalTenants: STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
          totalPlans: plans.length,
          activePlans: plans.filter((p) => p.isActive).length,
        })
      })
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }

  useEffect(load, [])

  if (isLoading) return <LoadingState label="Loading platform overview…" />
  if (error || !stats) return <ErrorState description={error?.message ?? 'Failed to load dashboard.'} onRetry={load} />

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Dashboard' }]} title="Platform Overview" />

      <div className="grid grid-cols-2 gap-space-sm px-gutter-lg sm:grid-cols-3 lg:grid-cols-6">
        <button type="button" onClick={() => navigate(ROUTES.platformTenants)} className="text-left">
          <MetricCard label="Total Tenants" value={stats.totalTenants} icon="apartment" />
        </button>
        <button type="button" onClick={() => navigate(`${ROUTES.platformTenants}?status=trial`)} className="text-left">
          <MetricCard label="Trial" value={stats.byStatus.trial} icon="hourglass_top" />
        </button>
        <button type="button" onClick={() => navigate(`${ROUTES.platformTenants}?status=active`)} className="text-left">
          <MetricCard label="Active" value={stats.byStatus.active} icon="check_circle" />
        </button>
        <button type="button" onClick={() => navigate(`${ROUTES.platformTenants}?status=suspended`)} className="text-left">
          <MetricCard label="Suspended" value={stats.byStatus.suspended} icon="block" tone={stats.byStatus.suspended > 0 ? 'danger' : 'default'} />
        </button>
        <button type="button" onClick={() => navigate(`${ROUTES.platformTenants}?status=cancelled`)} className="text-left">
          <MetricCard label="Cancelled" value={stats.byStatus.cancelled} icon="cancel" />
        </button>
        <button type="button" onClick={() => navigate(ROUTES.platformPlans)} className="text-left">
          <MetricCard label="Membership Plans" value={`${stats.activePlans} / ${stats.totalPlans}`} icon="sell" />
        </button>
      </div>
    </div>
  )
}
