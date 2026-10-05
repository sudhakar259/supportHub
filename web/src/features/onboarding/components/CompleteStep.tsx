import { useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export function CompleteStep() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center gap-space-lg py-space-lg text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
        <Icon name="verified" size={32} filled />
      </div>
      <div>
        <h2 className="text-headline-lg text-on-surface">You&rsquo;re all set</h2>
        <p className="mt-1 max-w-md text-body-md text-on-surface-variant">
          Your workspace is ready. You can revisit any of this setup anytime from Departments, Users, Settings, or
          Integrations.
        </p>
      </div>
      <Button size="lg" trailingIcon="arrow_forward" onClick={() => navigate(ROUTES.dashboard)}>
        Go to Dashboard
      </Button>
    </div>
  )
}
