import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

export interface AuthCardProps {
  children: ReactNode
  accentClassName?: string
  maxWidthClassName?: string
  className?: string
}

/** The rounded card with a top accent bar used by every unauthenticated screen. */
export function AuthCard({
  children,
  accentClassName = 'bg-primary',
  maxWidthClassName = 'max-w-xl',
  className,
}: AuthCardProps) {
  return (
    <div className={cn('w-full', maxWidthClassName)}>
      <div className={cn('relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-xl', className)}>
        <div className={cn('h-1.5 w-full', accentClassName)} />
        <div className="p-space-lg sm:p-space-xl">{children}</div>
      </div>
    </div>
  )
}
