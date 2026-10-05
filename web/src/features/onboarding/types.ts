export type OnboardingStep = 'departments' | 'team' | 'ticket-numbers' | 'integration' | 'complete'

export const ONBOARDING_STEPS: { key: OnboardingStep; label: string }[] = [
  { key: 'departments', label: 'Departments' },
  { key: 'team', label: 'Team Members' },
  { key: 'ticket-numbers', label: 'Ticket Numbers' },
  { key: 'integration', label: 'API Integration' },
  { key: 'complete', label: 'Complete' },
]

export type ResetPeriod = 'never' | 'yearly' | 'monthly' | 'daily'

export interface TicketNumberSetting {
  id: number
  departmentId: number | null
  prefix: string
  format: string
  startingNumber: number
  numberLength: number
  resetPeriod: ResetPeriod
  isActive: boolean
  effectiveFrom: string | null
}

export interface TicketNumberSettingPayload {
  prefix: string
  format: string
  startingNumber: number
  numberLength: number
  resetPeriod: ResetPeriod
  isActive?: boolean
}
