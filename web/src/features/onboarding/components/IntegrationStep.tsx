import { useState } from 'react'

import { SecretReveal } from '@/components/security/SecretReveal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { apiCredentialsApi } from '@/features/integrations/api/apiCredentialsApi'
import { ScopeSelector } from '@/features/integrations/components/ScopeSelector'
import type { ApiCredentialScope } from '@/features/integrations/types'
import { ApiError } from '@/types/api'

export interface IntegrationStepProps {
  onNext: () => void
}

export function IntegrationStep({ onNext }: IntegrationStepProps) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiCredentialScope[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ key: string; secret: string; scopes: ApiCredentialScope[] } | null>(null)

  async function handleCreate() {
    setError(null)
    setIsSubmitting(true)
    try {
      const credential = await apiCredentialsApi.create({ name, scopes })
      setCreated({ key: credential.key, secret: credential.secret, scopes: credential.scopes })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (created) {
    return (
      <SecretReveal
        primaryField={{ label: 'Client Key', value: created.key }}
        secret={created.secret}
        tags={created.scopes}
        tagsLabel="Authorized Scopes"
        continueLabel="Continue"
        onContinue={onNext}
      />
    )
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <div>
        <h2 className="text-headline-md text-on-surface">Connect an integration (optional)</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Create an API credential now if you already have a system to connect — e.g. a chat widget or CRM. You can always do
          this later from Integrations.
        </p>
      </div>

      <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Integration Name" placeholder="e.g. Chat widget" value={name} onChange={(e) => setName(e.target.value)} />
        <ScopeSelector selected={scopes} onChange={setScopes} />
      </div>

      <div className="flex justify-end gap-space-sm">
        <Button variant="ghost" onClick={onNext}>
          Skip for now
        </Button>
        <Button isLoading={isSubmitting} disabled={!name || scopes.length === 0} onClick={handleCreate} trailingIcon="arrow_forward">
          Create &amp; Continue
        </Button>
      </div>
    </div>
  )
}
