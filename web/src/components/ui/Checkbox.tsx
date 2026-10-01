import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

import { cn } from '@/utils/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  description?: ReactNode
}

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label htmlFor={inputId} className="flex cursor-pointer select-none items-start gap-space-sm">
      <input
        id={inputId}
        type="checkbox"
        className={cn('mt-0.5 h-4 w-4 cursor-pointer rounded accent-primary', className)}
        {...props}
      />
      {(label || description) && (
        <span className="flex flex-col text-body-sm text-on-surface-variant">
          {label && <span className="text-title-sm text-on-surface">{label}</span>}
          {description}
        </span>
      )}
    </label>
  )
}
