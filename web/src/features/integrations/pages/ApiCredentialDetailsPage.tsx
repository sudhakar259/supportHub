import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { CreatedApiCredential } from '@/features/integrations/api/apiCredentialsApi'
import { apiCredentialsApi } from '@/features/integrations/api/apiCredentialsApi'
import { ScopeSelector } from '@/features/integrations/components/ScopeSelector'
import type { ApiCredential, ApiCredentialScope } from '@/features/integrations/types'
import { SecretReveal } from '@/components/security/SecretReveal'
import { hasPermission } from '@/types/user'
import { formatDateTime } from '@/utils/datetime'

export function ApiCredentialDetailsPage() {
  const { credentialId } = useParams<{ credentialId: string }>()
  const id = Number(credentialId)
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const canUpdate = hasPermission(user, 'api-credentials.update')
  const canRevoke = hasPermission(user, 'api-credentials.revoke')

  const [credential, setCredential] = useState<ApiCredential | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [isEditingScopes, setIsEditingScopes] = useState(false)
  const [draftScopes, setDraftScopes] = useState<ApiCredentialScope[]>([])
  const [isSavingScopes, setIsSavingScopes] = useState(false)

  const [rotatedSecret, setRotatedSecret] = useState<CreatedApiCredential | null>(null)
  const [isRotating, setIsRotating] = useState(false)
  const [isRevokeOpen, setIsRevokeOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    apiCredentialsApi
      .get(id)
      .then(setCredential)
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [id, reloadToken])

  function startEditingScopes() {
    if (!credential) return
    setDraftScopes(credential.scopes)
    setIsEditingScopes(true)
  }

  async function saveScopes() {
    setIsSavingScopes(true)
    try {
      const updated = await apiCredentialsApi.update(id, { scopes: draftScopes })
      setCredential(updated)
      setIsEditingScopes(false)
      toast.success('Scopes updated')
    } catch (err) {
      toast.error('Failed to update scopes', err instanceof Error ? err.message : undefined)
    } finally {
      setIsSavingScopes(false)
    }
  }

  async function handleRotate() {
    setIsRotating(true)
    try {
      const rotated = await apiCredentialsApi.rotate(id)
      setRotatedSecret(rotated)
      setCredential(rotated)
    } catch (err) {
      toast.error('Failed to rotate secret', err instanceof Error ? err.message : undefined)
    } finally {
      setIsRotating(false)
    }
  }

  if (isLoading) return <LoadingState label="Loading credential…" />
  if (error || !credential) return <ErrorState onRetry={() => setReloadToken((t) => t + 1)} description={error?.message} />

  if (rotatedSecret) {
    return (
      <div className="flex flex-col gap-space-md pb-space-xl">
        <PageHeader
          breadcrumbs={[{ label: 'Integrations' }, { label: 'API Credentials', to: ROUTES.apiCredentials }, { label: credential.name }]}
          title="Secret Rotated"
        />
        <div className="max-w-3xl px-gutter-lg">
          <SecretReveal
            primaryField={{ label: 'Client Key', value: rotatedSecret.key }}
            secret={rotatedSecret.secret}
            tags={rotatedSecret.scopes}
            tagsLabel="Authorized Scopes"
            continueLabel="Done — back to credential"
            onContinue={() => setRotatedSecret(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-space-lg pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Integrations' }, { label: 'API Credentials', to: ROUTES.apiCredentials }, { label: credential.name }]}
        title={credential.name}
        meta={credential.status === 'active' ? <Badge tone="tertiary">Active</Badge> : <Badge tone="danger">Revoked</Badge>}
      />

      <div className="flex max-w-3xl flex-col gap-space-lg px-gutter-lg">
        <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">Client Key</span>
              <span className="font-code-sm text-code-sm text-on-surface">{credential.key}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">Secret</span>
              <span className="font-code-sm text-code-sm text-on-surface">••••••••{credential.secretLastFour}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">Created</span>
              <span className="text-body-sm text-on-surface">
                {credential.createdAt ? formatDateTime(credential.createdAt) : '—'}
                {credential.creator && <> by {credential.creator.name}</>}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">Last Used</span>
              <span className="text-body-sm text-on-surface">{credential.lastUsedAt ? formatDateTime(credential.lastUsedAt) : 'Never'}</span>
            </div>
            {credential.status === 'revoked' && credential.revokedAt && (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-label-sm font-bold uppercase tracking-wider text-error">Revoked</span>
                <span className="text-body-sm text-on-surface">{formatDateTime(credential.revokedAt)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm text-on-surface">Scopes</h2>
            {canUpdate && credential.status === 'active' && !isEditingScopes && (
              <Button variant="ghost" size="sm" leadingIcon="edit" onClick={startEditingScopes}>
                Edit Scopes
              </Button>
            )}
          </div>

          {isEditingScopes ? (
            <div className="flex flex-col gap-space-md">
              <ScopeSelector selected={draftScopes} onChange={setDraftScopes} />
              <div className="flex justify-end gap-space-sm">
                <Button variant="ghost" onClick={() => setIsEditingScopes(false)}>
                  Cancel
                </Button>
                <Button isLoading={isSavingScopes} disabled={draftScopes.length === 0} onClick={saveScopes}>
                  Save Scopes
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {credential.scopes.map((scope) => (
                <span
                  key={scope}
                  className="flex items-center gap-1.5 rounded-md bg-surface-container-high px-2.5 py-1 font-code-sm text-code-sm text-on-surface"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                  {scope}
                </span>
              ))}
            </div>
          )}
        </div>

        {credential.status === 'active' && (canUpdate || canRevoke) && (
          <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <h2 className="text-headline-sm text-on-surface">Danger Zone</h2>
            <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
              {canUpdate && (
                <div className="flex items-center justify-between gap-space-md rounded-lg bg-surface-container-low p-space-md">
                  <div>
                    <p className="text-title-sm text-on-surface">Rotate Secret</p>
                    <p className="text-body-sm text-on-surface-variant">Issues a new secret; the old one stops working immediately.</p>
                  </div>
                  <Button variant="ghost" isLoading={isRotating} leadingIcon="sync" onClick={handleRotate}>
                    Rotate
                  </Button>
                </div>
              )}
              {canRevoke && (
                <div className="flex items-center justify-between gap-space-md rounded-lg bg-error-container/30 p-space-md">
                  <div>
                    <p className="text-title-sm text-on-surface">Revoke Credential</p>
                    <p className="text-body-sm text-on-surface-variant">Permanently and irreversibly stops this credential from authenticating.</p>
                  </div>
                  <Button variant="danger" leadingIcon="block" onClick={() => setIsRevokeOpen(true)}>
                    Revoke
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isRevokeOpen}
        onClose={() => setIsRevokeOpen(false)}
        title="Revoke API Credential"
        description={`This permanently invalidates "${credential.name}" and immediately rejects every request made with it. This cannot be undone.`}
        confirmLabel="Permanently Revoke"
        confirmText={credential.key}
        onConfirm={async () => {
          const revoked = await apiCredentialsApi.revoke(id)
          setCredential(revoked)
          navigate(ROUTES.apiCredentialDetails(id), { replace: true })
        }}
        successMessage={`"${credential.name}" revoked.`}
      />
    </div>
  )
}
