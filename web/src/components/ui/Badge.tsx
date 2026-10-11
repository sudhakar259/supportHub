import type { ReactNode } from 'react'

import { cn } from '@/utils/cn'

export type BadgeTone = 'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface-container text-on-surface-variant',
  primary: 'bg-primary-fixed text-on-primary-fixed',
  secondary: 'bg-secondary-fixed text-on-secondary-fixed',
  tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  success: 'bg-success-container text-on-success-container',
  warning: 'bg-warning-container text-on-warning-container',
  danger: 'bg-error-container text-on-error-container',
}

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  icon?: ReactNode
  dot?: boolean
  className?: string
}

/** Pill-shaped status chip. Base primitive for StatusBadge / PriorityBadge. */
export function Badge({ tone = 'neutral', children, icon, dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-space-sm py-0.5 text-label-sm font-bold uppercase tracking-wider',
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon}
      {children}
    </span>
  )
}
