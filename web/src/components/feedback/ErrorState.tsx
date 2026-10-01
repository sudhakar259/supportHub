import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Failed to load data. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-sm py-space-xl text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-error">
        <Icon name="error" size={24} />
      </div>
      <p className="text-title-sm text-on-surface">{title}</p>
      <p className="text-body-sm text-on-surface-variant max-w-sm">{description}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" leadingIcon="refresh" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
