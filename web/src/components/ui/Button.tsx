import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Icon } from '@/components/ui/Icon'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container shadow-sm',
  secondary: 'bg-inverse-surface text-inverse-on-surface hover:bg-on-surface',
  ghost: 'bg-transparent text-on-surface border border-outline-variant/60 hover:bg-surface-container-low',
  danger: 'bg-error text-on-error hover:bg-on-error-container',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-space-sm text-label-md gap-space-xs',
  md: 'h-9 px-space-md text-title-sm gap-space-sm',
  lg: 'h-11 px-space-lg text-title-sm gap-space-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: string
  trailingIcon?: string
  isLoading?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded font-semibold transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Spinner className="text-current" size={16} />
      ) : (
        leadingIcon && <Icon name={leadingIcon} size={18} />
      )}
      {children}
      {!isLoading && trailingIcon && <Icon name={trailingIcon} size={18} />}
    </button>
  )
}
