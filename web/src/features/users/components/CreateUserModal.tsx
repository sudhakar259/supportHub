import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { PasswordField } from '@/components/ui/PasswordField'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { lookupsApi } from '@/features/tickets/api/lookupsApi'
import { usersApi } from '@/features/users/api/usersApi'
import { STAFF_ROLES } from '@/features/users/types'
import { fetchOrDefault } from '@/utils/fetchOrDefault'
import { ApiError } from '@/types/api'
import type { Department } from '@/types/department'
import type { User } from '@/types/user'

export interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (user: User) => void
}

export function CreateUserModal({ isOpen, onClose, onCreated }: CreateUserModalProps) {
  const toast = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [passwordMode, setPasswordMode] = useState<'email' | 'manual'>('email')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<string>(STAFF_ROLES[0])
  const [departmentIds, setDepartmentIds] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) fetchOrDefault(lookupsApi.listDepartments(), []).then(setDepartments)
  }, [isOpen])

  function toggleDepartment(id: number) {
    setDepartmentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      const user = await usersApi.create({
        name,
        email,
        password: passwordMode === 'manual' ? password : undefined,
        passwordConfirmation: passwordMode === 'manual' ? passwordConfirmation : undefined,
        phone: phone || undefined,
        role,
        departmentIds: [...departmentIds],
      })
      toast.success(
        'User Created Successfully',
        passwordMode === 'email'
          ? `${user.name} (${user.email}) was added as ${role} and emailed a sign-in link.`
          : `${user.name} (${user.email}) was added as ${role}.`,
      )
      onCreated(user)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to create user.'
        setError(message)
        toast.error('Failed to Create User', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Staff User"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-user-form" isLoading={isSubmitting} leadingIcon="person_add">
            Create User
          </Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Full Name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />

        <div className="flex flex-col gap-space-xs">
          <span className="text-label-md uppercase tracking-wider text-secondary">Sign-in Credential</span>
          <label className="flex items-start gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
            <input
              type="radio"
              name="password-mode"
              checked={passwordMode === 'email'}
              onChange={() => setPasswordMode('email')}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
            />
            <span className="flex flex-col text-body-sm text-on-surface-variant">
              <span className="text-title-sm text-on-surface">Email a secure sign-in link</span>
              <span>The new teammate receives a password-reset email and sets their own password. Nobody else ever sees it.</span>
            </span>
          </label>
          <label className="flex items-start gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
            <input
              type="radio"
              name="password-mode"
              checked={passwordMode === 'manual'}
              onChange={() => setPasswordMode('manual')}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
            />
            <span className="flex flex-col text-body-sm text-on-surface-variant">
              <span className="text-title-sm text-on-surface">Set a password now</span>
              <span>Choose the initial password yourself.</span>
            </span>
          </label>
        </div>

        {passwordMode === 'manual' && (
          <div className="grid grid-cols-2 gap-space-sm">
            <PasswordField label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} />
            <PasswordField
              label="Confirm Password"
              required
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
            />
          </div>
        )}

        <TextField label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectField>
        {departments.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-label-md uppercase tracking-wider text-secondary">Departments</span>
            <div className="grid grid-cols-2 gap-1.5">
              {departments.map((dept) => (
                <Checkbox
                  key={dept.id}
                  checked={departmentIds.has(dept.id)}
                  onChange={() => toggleDepartment(dept.id)}
                  label={dept.name}
                />
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
