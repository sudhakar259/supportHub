import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import type { DataTableColumn } from '@/components/tables/DataTable'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useApiCredentials } from '@/features/integrations/hooks/useApiCredentials'
import type { ApiCredential } from '@/features/integrations/types'
import { hasPermission } from '@/types/user'
import { formatDateTime } from '@/utils/datetime'

export function ApiCredentialsListPage() {
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'api-credentials.create')
  const { credentials, isLoading, error, refetch } = useApiCredentials()
  const navigate = useNavigate()
  const toast = useToast()

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key)
    toast.success('Client key copied to clipboard')
  }

  const columns: DataTableColumn<ApiCredential>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (c) => (
        <Link to={ROUTES.apiCredentialDetails(c.id)} className="font-bold text-on-surface hover:text-primary">
          {c.name}
        </Link>
      ),
    },
    {
      key: 'key',
      header: 'Client Key',
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <span className="font-code-sm text-code-sm text-secondary">{c.key}</span>
          <button type="button" onClick={() => copyKey(c.key)} aria-label="Copy client key" className="text-secondary hover:text-on-surface">
            <Icon name="content_copy" size={16} />
          </button>
        </div>
      ),
    },
    {
      key: 'scopes',
      header: 'Scopes',
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.scopes.slice(0, 2).map((scope) => (
            <span key={scope} className="rounded bg-surface-container-high px-1.5 py-0.5 font-code-sm text-code-sm text-on-surface">
              {scope}
            </span>
          ))}
          {c.scopes.length > 2 && <span className="text-label-sm text-secondary">+{c.scopes.length - 2} more</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (c.status === 'active' ? <Badge tone="tertiary">Active</Badge> : <Badge tone="danger">Revoked</Badge>),
    },
    {
      key: 'lastUsed',
      header: 'Last Used',
      render: (c) => (c.lastUsedAt ? formatDateTime(c.lastUsedAt) : <span className="text-secondary">Never</span>),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right whitespace-nowrap',
      render: (c) => (
        <Link to={ROUTES.apiCredentialDetails(c.id)} className="text-label-sm font-bold uppercase text-primary hover:underline">
          Manage
        </Link>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Integrations' }, { label: 'API Credentials' }]}
        title="API Credentials"
        meta={<span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary">{credentials.length} total</span>}
        actions={
          canCreate && (
            <Button leadingIcon="add" onClick={() => navigate(ROUTES.apiCredentialsCreate)}>
              Create Credential
            </Button>
          )
        }
      />

      <div className="px-gutter-lg">
        <DataTable
          columns={columns}
          rows={credentials}
          getRowId={(c) => String(c.id)}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          emptyTitle="No API credentials yet"
          emptyDescription="Create a credential to let an external app authenticate against this tenant's Integration API."
          rowClassName={(c) => (c.status === 'revoked' ? 'opacity-60' : undefined)}
        />
      </div>
    </div>
  )
}
