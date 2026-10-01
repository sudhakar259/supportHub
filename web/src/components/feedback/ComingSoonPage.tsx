import { Icon } from '@/components/ui/Icon'

export interface ComingSoonPageProps {
  title: string
}

/** Placeholder for nav destinations not yet built (Tickets, Customers, Admin, …) — replaced phase by phase. */
export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-sm p-gutter-lg py-space-xl text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-secondary">
        <Icon name="construction" size={24} />
      </div>
      <h1 className="text-headline-sm text-on-surface">{title}</h1>
      <p className="max-w-sm text-body-sm text-on-surface-variant">This screen is scheduled for an upcoming build phase.</p>
    </div>
  )
}
