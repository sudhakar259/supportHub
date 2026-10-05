import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import type { CreatedApiCredential } from '@/features/integrations/api/apiCredentialsApi'
import { apiCredentialsApi } from '@/features/integrations/api/apiCredentialsApi'
import { ScopeSelector } from '@/features/integrations/components/ScopeSelector'
import type { ApiCredentialScope } from '@/features/integrations/types'
import { SecretReveal } from '@/components/security/SecretReveal'
import { ApiError } from '@/types/api'

export function CreateApiCredentialPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiCredentialScope[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [created, setCreated] = useState<CreatedApiCredential | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldError(undefined)
    setIsSubmitting(true)

    try {
      const credential = await apiCredentialsApi.create({ name, scopes })
      setCreated(credential)
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldError(err.fieldError('name') ?? err.fieldError('scopes'))
        if (!err.fieldError('name') && !err.fieldError('scopes')) setError(err.message)
      } else {
        setError('Unable to reach the server. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (created) {
    return (
      <div className="flex flex-col gap-space-md pb-space-xl">
        <PageHeader
          breadcrumbs={[{ label: 'Integrations' }, { label: 'API Credentials', to: ROUTES.apiCredentials }, { label: 'Created' }]}
          title="API Credential Created"
        />
        <div className="max-w-3xl px-gutter-lg">
          <SecretReveal
            primaryField={{ label: 'Client Key', value: created.key }}
            secret={created.secret}
            tags={created.scopes}
            tagsLabel="Authorized Scopes"
            onContinue={() => navigate(ROUTES.apiCredentialDetails(created.id))}
            continueLabel="Continue to credential details"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Integrations' }, { label: 'API Credentials', to: ROUTES.apiCredentials }, { label: 'Create' }]}
        title="Create API Credential"
      />

      <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-space-lg px-gutter-lg">
        {error && <InlineAlert tone="error" title="Couldn't create credential" description={error} />}

        <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <h2 className="mb-space-md text-headline-sm text-on-surface">Integration Name</h2>
          <TextField
            label="Name"
            required
            placeholder="e.g. Chat widget"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldError}
            helperText="Identifies this client application in audit logs."
          />
        </div>

        <div>
          <h2 className="mb-space-md text-headline-sm text-on-surface">Scopes</h2>
          <ScopeSelector selected={scopes} onChange={setScopes} />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <span className="text-body-sm text-on-surface-variant">{scopes.length} scope(s) selected</span>
          <div className="flex items-center gap-space-sm">
            <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.apiCredentials)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={!name.trim() || scopes.length === 0} trailingIcon="arrow_forward">
              Create Credential
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
