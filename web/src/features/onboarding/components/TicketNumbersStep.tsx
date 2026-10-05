import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { ticketNumberSettingsApi } from '@/features/onboarding/api/ticketNumberSettingsApi'
import type { ResetPeriod } from '@/features/onboarding/types'
import { ApiError } from '@/types/api'

export interface TicketNumbersStepProps {
  onNext: () => void
}

const RESET_PERIODS: { value: ResetPeriod; label: string }[] = [
  { value: 'never', label: 'Never (sequence never resets)' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily', label: 'Daily' },
]

/** Mirrors GenerateTicketNumberAction::format() so the preview matches what the backend will actually generate. */
function previewNumber(prefix: string, format: string, startingNumber: number, numberLength: number): string {
  const now = new Date()
  const replacements: Record<string, string> = {
    '{prefix}': prefix || 'TKT',
    '{number}': String(startingNumber || 1).padStart(numberLength || 1, '0'),
    '{year}': String(now.getFullYear()),
    '{month}': String(now.getMonth() + 1).padStart(2, '0'),
    '{day}': String(now.getDate()).padStart(2, '0'),
    '{department}': 'GENERAL',
    '{department_code}': 'GEN',
  }
  return Object.entries(replacements).reduce((acc, [token, value]) => acc.split(token).join(value), format)
}

export function TicketNumbersStep({ onNext }: TicketNumbersStepProps) {
  const [prefix, setPrefix] = useState('TKT')
  const [format, setFormat] = useState('{prefix}-{year}-{number}')
  const [startingNumber, setStartingNumber] = useState(1)
  const [numberLength, setNumberLength] = useState(6)
  const [resetPeriod, setResetPeriod] = useState<ResetPeriod>('yearly')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(
    () => previewNumber(prefix, format, startingNumber, numberLength),
    [prefix, format, startingNumber, numberLength],
  )

  async function handleSave() {
    setError(null)
    setIsSubmitting(true)
    try {
      await ticketNumberSettingsApi.create({ prefix, format, startingNumber, numberLength, resetPeriod })
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <div>
        <h2 className="text-headline-md text-on-surface">Ticket number format</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Choose how ticket numbers look. You can change this later from Settings.
        </p>
      </div>

      <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
          <TextField label="Prefix" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} maxLength={20} />
          <TextField
            label="Format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            helperText="Tokens: {prefix} {number} {year} {month} {day}"
          />
          <TextField
            label="Starting Number"
            type="number"
            min={1}
            value={startingNumber}
            onChange={(e) => setStartingNumber(Number(e.target.value) || 1)}
          />
          <TextField
            label="Number Length"
            type="number"
            min={1}
            max={20}
            value={numberLength}
            onChange={(e) => setNumberLength(Number(e.target.value) || 1)}
          />
          <SelectField label="Resets" value={resetPeriod} onChange={(e) => setResetPeriod(e.target.value as ResetPeriod)}>
            {RESET_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="rounded-lg bg-surface-container-low p-space-md">
          <span className="text-label-sm font-bold uppercase tracking-wider text-secondary">Preview</span>
          <div className="mt-1 font-code-sm text-headline-sm text-primary">{preview}</div>
        </div>

        <Button variant="ghost" leadingIcon={saved ? 'check_circle' : 'save'} isLoading={isSubmitting} onClick={handleSave} className="self-start">
          {saved ? 'Saved' : 'Save Format'}
        </Button>
      </div>

      <div className="flex justify-end gap-space-sm">
        <Button variant="ghost" onClick={onNext}>
          Skip for now
        </Button>
        <Button onClick={onNext} trailingIcon="arrow_forward">
          Continue
        </Button>
      </div>
    </div>
  )
}
