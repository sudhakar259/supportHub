import type { FormEvent } from 'react'
import { useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/TextField'
import { rolesApi } from '@/features/roles/api/rolesApi'
import { ApiError } from '@/types/api'
import type { Role } from '@/types/role'

export interface CreateRoleModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (role: Role) => void
}

export function CreateRoleModal({ isOpen, onClose, onCreated }: CreateRoleModalProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const role = await rolesApi.create({ name })
      toast.success('Role Created', `"${role.name}" has been created.`)
      setName('')
      onCreated(role)
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.fieldError('name') ?? err.message : 'Failed to create role.'
      setError(message)
      toast.error('Failed to Create Role', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Role"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-role-form" isLoading={isSubmitting} leadingIcon="add_moderator">
            Create Role
          </Button>
        </>
      }
    >
      <form id="create-role-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField
          label="Role Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Billing Specialist"
          helperText="You'll configure its permissions on the next screen."
        />
      </form>
    </Modal>
  )
}
