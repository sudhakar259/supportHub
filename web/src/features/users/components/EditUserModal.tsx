import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { Switch } from '@/components/ui/Switch'
import { TextField } from '@/components/ui/TextField'
import { usersApi } from '@/features/users/api/usersApi'
import { STAFF_ROLES } from '@/features/users/types'
import { ApiError } from '@/types/api'
import type { User } from '@/types/user'

export interface EditUserModalProps {
  user: User | null
  onClose: () => void
  onUpdated: (user: User) => void
}

export function EditUserModal({ user, onClose, onUpdated }: EditUserModalProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [role, setRole] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setEmail(user.email)
    setPhone(user.phone ?? '')
    setIsActive(user.isActive)
    setRole(user.roles[0] ?? '')
  }, [user])

  if (!user) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      let updated = await usersApi.update(user.id, { name, email, phone: phone || undefined, isActive })
      if (role && role !== user.roles[0]) {
        updated = await usersApi.syncRoles(user.id, [role])
      }
      toast.success('User Updated', `${updated.name} (${updated.email}) has been saved.`)
      onUpdated(updated)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to update user.'
        setError(message)
        toast.error('Failed to Update User', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={Boolean(user)}
      onClose={onClose}
      title={`Edit ${user.name}`}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-user-form" isLoading={isSubmitting} leadingIcon="save">
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Full Name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
        <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectField>

        <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-space-md">
          <div>
            <div className="text-title-sm text-on-surface">Account Active</div>
            <div className="text-body-sm text-on-surface-variant">Inactive users cannot sign in.</div>
          </div>
          <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        </div>
      </form>
    </Modal>
  )
}
