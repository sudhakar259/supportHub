import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { lookupsApi } from '@/features/tickets/api/lookupsApi'
import { fetchOrDefault } from '@/utils/fetchOrDefault'
import type { Department } from '@/types/department'
import type { AssignTicketPayload } from '@/types/ticket'
import type { User } from '@/types/user'

export interface AssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onAssign: (payload: AssignTicketPayload) => Promise<void>
  currentAssigneeId?: number
  currentDepartmentId?: number
}

export function AssignmentDialog({ isOpen, onClose, onAssign, currentAssigneeId, currentDepartmentId }: AssignmentDialogProps) {
  const toast = useToast()
  const [agents, setAgents] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [assigneeId, setAssigneeId] = useState<number | ''>(currentAssigneeId ?? '')
  const [departmentId, setDepartmentId] = useState<number | ''>(currentDepartmentId ?? '')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    Promise.all([fetchOrDefault(lookupsApi.listAgents(), []), fetchOrDefault(lookupsApi.listDepartments(), [])]).then(([agentList, departmentList]) => {
      setAgents(agentList)
      setDepartments(departmentList)
    })
  }, [isOpen])

  async function handleSubmit() {
    if (!assigneeId) {
      setError('Choose an agent to assign this ticket to.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await onAssign({ assigneeId: Number(assigneeId), departmentId: departmentId ? Number(departmentId) : undefined, note })
      const agentName = agents.find((a) => a.id === Number(assigneeId))?.name ?? 'the selected agent'
      toast.success(currentAssigneeId ? 'Ticket Reassigned' : 'Ticket Assigned', `Assigned to ${agentName}.`)
      setNote('')
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign ticket.'
      setError(message)
      toast.error('Assignment Failed', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentAssigneeId ? 'Reassign Ticket' : 'Assign Ticket'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting} leadingIcon="person_add">
            Confirm Assignment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <SelectField label="Assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Select an agent…</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Department (optional)"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">Keep current department</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="assignment-note" className="text-label-md uppercase tracking-wider text-secondary">
            Note (optional)
          </label>
          <textarea
            id="assignment-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Reassigning — original agent is OOO."
            className="w-full resize-y rounded-lg bg-surface-container-low p-space-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </Modal>
  )
}
