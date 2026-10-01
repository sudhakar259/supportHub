import { Spinner } from '@/components/ui/Spinner'

export interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-sm py-space-xl text-on-surface-variant">
      <Spinner size={28} />
      <p className="text-body-sm">{label}</p>
    </div>
  )
}
