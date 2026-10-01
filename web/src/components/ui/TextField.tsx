import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

import { cn } from '@/utils/cn'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  helperText?: string
  error?: string
  required?: boolean
  leadingIcon?: ReactNode
  trailingSlot?: ReactNode
  labelAside?: ReactNode
  containerClassName?: string
}

/** Standard text input matching the Stitch "Input Fields & Search Bars" spec. */
export function TextField({
  label,
  helperText,
  error,
  required,
  leadingIcon,
  trailingSlot,
  labelAside,
  containerClassName,
  className,
  id,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={cn('flex flex-col gap-space-xs', containerClassName)}>
      {(label || labelAside) && (
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={inputId} className="text-title-sm text-on-surface flex items-center gap-1">
              {label}
              {required && <span className="text-primary">*</span>}
            </label>
          )}
          {labelAside}
        </div>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-space-md flex items-center text-secondary">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'h-11 w-full rounded bg-surface-container-low px-space-md text-body-md text-on-surface shadow-inner transition-all placeholder:text-on-surface-variant/60',
            'focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary',
            leadingIcon && 'pl-10',
            trailingSlot && 'pr-10',
            error && 'ring-2 ring-error bg-error-container/10',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {trailingSlot && <span className="absolute right-space-md flex items-center">{trailingSlot}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-body-sm text-error">
          {error}
        </p>
      ) : (
        helperText && (
          <p id={`${inputId}-helper`} className="text-body-sm text-on-surface-variant">
            {helperText}
          </p>
        )
      )}
    </div>
  )
}
