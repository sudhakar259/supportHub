import type { ReactNode, SelectHTMLAttributes } from 'react'
import { useId } from 'react'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/utils/cn'

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: ReactNode
  containerClassName?: string
}

/** Native <select> styled to match the design system — keeps full keyboard/a11y support instead of a custom dropdown widget. */
export function SelectField({ label, children, className, id, containerClassName, ...props }: SelectFieldProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="text-label-md uppercase tracking-wider text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'h-10 w-full appearance-none rounded-lg bg-surface-container-lowest px-space-md pr-10 text-body-md text-on-surface shadow-sm',
            'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <Icon name="expand_more" size={20} className="pointer-events-none absolute top-2.5 right-space-md text-secondary" />
      </div>
    </div>
  )
}
