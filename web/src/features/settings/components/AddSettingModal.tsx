import type { FormEvent } from 'react'
import { useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { systemSettingsApi } from '@/features/settings/api/systemSettingsApi'
import type { SettingType, SystemSetting } from '@/types/systemSetting'

export interface AddSettingModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (settings: SystemSetting[]) => void
}

export function AddSettingModal({ isOpen, onClose, onSaved }: AddSettingModalProps) {
  const toast = useToast()
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [type, setType] = useState<SettingType>('string')
  const [group, setGroup] = useState('general')
  const [isPublic, setIsPublic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const parsedValue = type === 'boolean' ? value === 'true' : type === 'integer' ? Number(value) : value
      const saved = await systemSettingsApi.upsert([{ key, value: parsedValue, type, group, isPublic }])
      toast.success('Setting Created', `"${key}" has been saved.`)
      onSaved(saved)
      setKey('')
      setValue('')
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save setting.'
      setError(message)
      toast.error('Failed to Create Setting', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Setting"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-setting-form" isLoading={isSubmitting} leadingIcon="save">
            Save
          </Button>
        </>
      }
    >
      <form id="add-setting-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField
          label="Key"
          required
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="e.g. support_hours_message"
        />
        <TextField label="Group" required value={group} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. general, security" />
        <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value as SettingType)}>
          <option value="string">String</option>
          <option value="integer">Integer</option>
          <option value="boolean">Boolean</option>
          <option value="json">JSON</option>
        </SelectField>
        {type === 'boolean' ? (
          <SelectField label="Value" value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="true">True</option>
            <option value="false">False</option>
          </SelectField>
        ) : (
          <TextField label="Value" required value={value} onChange={(e) => setValue(e.target.value)} />
        )}
        <Checkbox
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          label="Public"
          description={<span className="text-secondary">Visible to any authenticated user, not just admins.</span>}
        />
      </form>
    </Modal>
  )
}
