import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/features/auth/hooks/useAuth'

/**
 * Landing page after sign-in. The real "Operations Center" dashboard (metric
 * cards, SLA warnings desk, queue distribution, agent capacity) is Phase 3 —
 * this placeholder confirms the shell, auth, and routing wiring in the meantime.
 */
export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col gap-space-lg p-gutter-lg">
      <div>
        <h1 className="text-headline-lg tracking-tight text-on-surface">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-body-md text-on-surface-variant">
          You&rsquo;re signed in to the SupportHub workspace. The full Operations Center dashboard lands in the next build phase.
        </p>
      </div>
      <div className="flex items-center gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-primary">
          <Icon name="confirmation_number" size={24} />
        </div>
        <div>
          <div className="text-title-sm text-on-surface">Tickets, customers, and admin screens</div>
          <div className="text-body-sm text-on-surface-variant">Coming up in Phase 3 (Ticket experience) and beyond.</div>
        </div>
      </div>
    </div>
  )
}
