import type { FormEvent } from 'react'
import { useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { authApi } from '@/features/auth/api/authApi'
import { usersApi } from '@/features/users/api/usersApi'
import { STAFF_ROLES } from '@/features/users/types'
import { ApiError } from '@/types/api'
import type { User } from '@/types/user'

export interface TeamStepProps {
  onNext: () => void
}

export function TeamStep({ onNext }: TeamStepProps) {
  const toast = useToast()
  const [teammates, setTeammates] = useState<User[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>(STAFF_ROLES[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const user = await usersApi.create({ name, email, role })
      setTeammates((prev) => [...prev, user])
      setName('')
      setEmail('')
      toast.success('Invitation sent', `${user.name} was emailed a secure sign-in link.`)
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to reach the server.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function resend(teammateEmail: string) {
    await authApi.forgotPassword({ email: teammateEmail })
    toast.success('Sign-in link resent')
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <div>
        <h2 className="text-headline-md text-on-surface">Add your team</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Each teammate is emailed a secure link to set their own password — nobody shares a password by hand.
        </p>
      </div>

      {teammates.length > 0 && (
        <ul className="flex flex-col gap-space-xs">
          {teammates.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
              <div className="flex items-center gap-space-sm">
                <Icon name="person" size={18} className="text-secondary" />
                <span className="text-title-sm text-on-surface">{t.name}</span>
                <span className="text-body-sm text-secondary">{t.email}</span>
              </div>
              <button type="button" onClick={() => resend(t.email)} className="text-label-sm font-bold uppercase text-primary hover:underline">
                Resend email
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-3">
          <TextField label="Full Name" placeholder="Jamie Rivera" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
          <TextField
            label="Work Email"
            type="email"
            placeholder="jamie@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </SelectField>
        </div>
        <Button type="submit" variant="ghost" leadingIcon="person_add" isLoading={isSubmitting} disabled={!name || !email} className="self-start">
          Add Teammate
        </Button>
      </form>

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
