import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { TextField } from '@/components/ui/TextField'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { tenantsApi } from '@/features/tenants/api/tenantsApi'
import { isWorkspaceSlug, workspaceDomain, workspaceUrl } from './workspace'

export function WorkspaceFinder() {
  const [slug, setSlug] = useState('')
  const [error, setError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const normalized = slug.trim().toLowerCase()
    if (!isWorkspaceSlug(normalized)) {
      setError('Use your workspace ID: lowercase letters, numbers and hyphens.')
      return
    }
    setError(undefined)
    setIsSubmitting(true)
    try {
      const result = await tenantsApi.lookupSlug(normalized)
      if (!result) setError('We couldn’t check your workspace. Please try again.')
      else if (result.available) setError('We couldn’t find that workspace. Check the ID or create a workspace.')
      else {
        const url = workspaceUrl(normalized)
        if (url) window.location.assign(url)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard maxWidthClassName="w-full max-w-xl">
        <span className="marketing-eyebrow">YOUR SUPPORTHUB WORKSPACE</span>
        <h1 className="mt-space-sm text-headline-lg">Where does your team work?</h1>
        <p className="mt-space-sm text-body-md text-on-surface-variant">Enter your workspace ID to open your team’s sign-in page.</p>
        <form className="mt-space-lg space-y-space-md" onSubmit={handleSubmit}>
          <TextField label="Workspace ID" required placeholder="crevol" value={slug} onChange={(event) => { setSlug(event.target.value); setError(undefined) }} error={error} autoComplete="organization" leadingIcon={<Icon name="domain" size={20} />} helperText={`${slug.trim().toLowerCase() || 'your-workspace'}.${workspaceDomain()}`} />
          <Button type="submit" className="w-full" isLoading={isSubmitting} trailingIcon="arrow_forward">Continue to workspace</Button>
        </form>
        <p className="mt-space-lg text-body-sm text-on-surface-variant">New to SupportHub? <Link to={ROUTES.register} className="font-semibold text-primary">Create a workspace</Link></p>
        <Link to={`${ROUTES.login}?platform=1`} className="mt-space-lg inline-block text-label-md text-secondary hover:underline">Platform administrator sign-in</Link>
      </AuthCard>
    </AuthLayout>
  )
}
