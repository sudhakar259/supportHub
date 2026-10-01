import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

/** Toggle switch for boolean settings like `is_active`. */
export function Switch({ label, id, className, ...props }: SwitchProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label htmlFor={inputId} className="inline-flex cursor-pointer items-center gap-space-sm">
      <span className="relative inline-flex items-center">
        <input id={inputId} type="checkbox" className="peer sr-only" {...props} />
        <div
          className={
            'h-6 w-11 rounded-full bg-surface-container-high transition-colors ' +
            'after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[\'\'] ' +
            'peer-checked:bg-primary peer-checked:after:translate-x-full ' +
            (className ?? '')
          }
        />
      </span>
      {label && <span className="text-body-sm text-on-surface">{label}</span>}
    </label>
  )
}
