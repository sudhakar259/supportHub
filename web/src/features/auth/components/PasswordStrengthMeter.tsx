import { Icon } from '@/components/ui/Icon'
import { cn } from '@/utils/cn'

export interface PasswordRequirement {
  id: string
  label: string
  test: (value: string) => boolean
}

export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'At least 12 characters', test: (v) => v.length >= 12 },
  { id: 'upper', label: 'One uppercase letter (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'number', label: 'At least one number (0-9)', test: (v) => /[0-9]/.test(v) },
  { id: 'symbol', label: 'Special symbol (!@#$%^&*)', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export function passwordScore(value: string, requirements: PasswordRequirement[]): number {
  if (!value) return 0
  return requirements.filter((req) => req.test(value)).length
}

const STRENGTH_LABELS = ['None', 'Weak', 'Fair', 'Strong', 'Enterprise Compliant']
const STRENGTH_BAR_COLOR = ['bg-surface-container', 'bg-error', 'bg-warning', 'bg-success', 'bg-success']

export interface PasswordStrengthMeterProps {
  value: string
  requirements?: PasswordRequirement[]
}

/** Live entropy meter + requirement checklist shared by Reset Password and Set Password. */
export function PasswordStrengthMeter({ value, requirements = DEFAULT_PASSWORD_REQUIREMENTS }: PasswordStrengthMeterProps) {
  const score = passwordScore(value, requirements)

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between text-label-sm">
          <span className="font-medium uppercase tracking-wider text-secondary">Strength:</span>
          <span className="font-bold uppercase tracking-wider text-on-surface">{STRENGTH_LABELS[score]}</span>
        </div>
        <div className="grid h-1.5 w-full grid-cols-4 gap-1.5">
          {requirements.map((_, i) => (
            <div
              key={i}
              className={cn('h-full rounded-sm transition-all duration-300', i < score ? STRENGTH_BAR_COLOR[score] : 'bg-surface-container')}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-space-md gap-y-space-xs rounded-lg bg-surface-container-low p-space-md sm:grid-cols-2">
        {requirements.map((req) => {
          const met = req.test(value)
          return (
            <div
              key={req.id}
              className={cn('flex items-center gap-space-xs transition-colors duration-200', met ? 'text-tertiary' : 'text-secondary')}
            >
              <Icon name={met ? 'check_circle' : 'radio_button_unchecked'} size={18} filled={met} />
              <span className="text-body-sm">{req.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
