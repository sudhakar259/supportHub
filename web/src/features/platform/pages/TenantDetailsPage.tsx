import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import type { BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { MetricCard } from '@/features/tickets/components/MetricCard'
import { platformTenantsApi } from '@/features/platform/api/platformTenantsApi'
import type { AdminTenant, TenantStatus } from '@/features/platform/types'
import { formatPriceCents } from '@/utils/money'
import { ApiError } from '@/types/api'

const STATUS_TONE: Record<TenantStatus, BadgeTone> = {
  trial: 'secondary',
  active: 'tertiary',
  suspended: 'danger',
  cancelled: 'neutral',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TenantDetailsPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const toast = useToast()

  const [tenant, setTenant] = useState<AdminTenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [country, setCountry] = useState('')
  const [timezone, setTimezone] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [confirmActivate, setConfirmActivate] = useState(false)

  function load() {
    if (!tenantId) return
    setIsLoading(true)
    setError(null)
    platformTenantsApi
      .get(Number(tenantId))
      .then((t) => {
        setTenant(t)
        setName(t.name)
        setEmail(t.email ?? '')
        setPhone(t.phone ?? '')
        setWebsite(t.website ?? '')
        setCountry(t.country ?? '')
        setTimezone(t.timezone)
      })
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }

  useEffect(load, [tenantId])

  /**
   * update()/suspend()/activate() responses don't eager-load subscription or
   * the users/customers/tickets counts the way get() does (only show()/index()
   * do on the backend) — refetch the full resource after any mutation instead
   * of trusting that response directly, or the Subscription panel and stat
   * cards would blank out after every save.
   */
  function refreshTenant() {
    if (!tenantId) return
    platformTenantsApi.get(Number(tenantId)).then(setTenant).catch(() => {})
  }

  async function handleSave() {
    if (!tenant) return
    setIsSaving(true)
    setFieldErrors({})
    try {
      const updated = await platformTenantsApi.update(tenant.id, {
        name,
        email: email || null,
        phone: phone || null,
        website: website || null,
        country: country || null,
        timezone,
      })
      refreshTenant()
      toast.success('Tenant Updated', `"${updated.name}" has been saved.`)
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        toast.error('Failed to Save Tenant', err instanceof Error ? err.message : 'Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading tenant…" />
  if (error || !tenant) return <ErrorState description={error?.message ?? 'Tenant not found.'} onRetry={load} />

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Tenants', to: ROUTES.platformTenants }, { label: tenant.name }]}
        title={tenant.name}
        meta={<Badge tone={STATUS_TONE[tenant.status]}>{tenant.status}</Badge>}
        actions={
          tenant.status === 'suspended' ? (
            <Button leadingIcon="play_circle" onClick={() => setConfirmActivate(true)}>
              Activate Tenant
            </Button>
          ) : (
            <Button variant="danger" leadingIcon="block" onClick={() => setConfirmSuspend(true)}>
              Suspend Tenant
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-space-md px-gutter-lg">
        <div className="grid grid-cols-3 gap-space-sm">
          <MetricCard label="Users" value={tenant.usersCount} icon="group" />
          <MetricCard label="Customers" value={tenant.customersCount} icon="support_agent" />
          <MetricCard label="Tickets" value={tenant.ticketsCount} icon="confirmation_number" />
        </div>

        <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <h2 className="mb-space-md text-title-md text-on-surface">Organization Details</h2>
          <div className="grid grid-cols-2 gap-space-sm">
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
            <TextField label="Slug" value={tenant.slug} disabled helperText="Slug cannot be changed from the platform console." />
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
            <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldErrors.phone} />
            <TextField label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} error={fieldErrors.website} />
            <TextField label="Country" value={country} onChange={(e) => setCountry(e.target.value)} error={fieldErrors.country} maxLength={2} />
            <TextField label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} error={fieldErrors.timezone} />
          </div>
          <div className="mt-space-md flex justify-end">
            <Button leadingIcon="save" isLoading={isSaving} onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <h2 className="mb-space-md text-title-md text-on-surface">Subscription</h2>
          {tenant.subscription ? (
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-title-sm font-semibold text-on-surface">{tenant.subscription.plan.name}</div>
                  <div className="text-body-sm text-on-surface-variant">
                    {formatPriceCents(tenant.subscription.plan.priceCents, tenant.subscription.plan.currency)} / {tenant.subscription.plan.billingInterval}
                  </div>
                </div>
                <Badge tone="secondary">{tenant.subscription.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-space-sm text-body-sm">
                <div>
                  <div className="text-secondary">Trial Ends</div>
                  <div className="text-on-surface">{formatDate(tenant.subscription.trialEndsAt)}</div>
                </div>
                <div>
                  <div className="text-secondary">Current Period Ends</div>
                  <div className="text-on-surface">{formatDate(tenant.subscription.currentPeriodEndsAt)}</div>
                </div>
                <div>
                  <div className="text-secondary">Cancelled</div>
                  <div className="text-on-surface">{formatDate(tenant.subscription.cancelledAt)}</div>
                </div>
              </div>
              <p className="text-body-sm text-on-surface-variant">Plan changes are managed by the tenant from their own Billing page.</p>
            </div>
          ) : (
            <p className="text-body-sm text-on-surface-variant">No subscription on record.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        title="Suspend Tenant"
        description={`This immediately blocks every user of "${tenant.name}" from signing in. You can reverse this anytime by activating the tenant again.`}
        confirmLabel="Suspend"
        successMessage={`"${tenant.name}" suspended.`}
        onConfirm={async () => {
          await platformTenantsApi.suspend(tenant.id)
          refreshTenant()
        }}
      />
      <ConfirmDialog
        isOpen={confirmActivate}
        onClose={() => setConfirmActivate(false)}
        title="Activate Tenant"
        description={`This restores sign-in access for every user of "${tenant.name}".`}
        confirmLabel="Activate"
        confirmVariant="primary"
        successMessage={`"${tenant.name}" activated.`}
        onConfirm={async () => {
          await platformTenantsApi.activate(tenant.id)
          refreshTenant()
        }}
      />
    </div>
  )
}
