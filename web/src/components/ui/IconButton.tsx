import type { ButtonHTMLAttributes } from 'react'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/utils/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  label: string
  size?: number
}

/** Icon-only button. Always requires a `label` for accessibility (used as aria-label). */
export function IconButton({ icon, label, size = 20, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-2 text-secondary transition-colors hover:bg-surface-container hover:text-on-surface',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}
