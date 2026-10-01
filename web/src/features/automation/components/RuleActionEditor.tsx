import { IconButton } from '@/components/ui/IconButton'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { ACTION_TYPES } from '@/types/routingRule'
import type { ActionType, RuleAction } from '@/types/routingRule'
import type { Department } from '@/types/department'
import type { TicketPriority } from '@/types/ticket'
import type { User } from '@/types/user'

const TYPE_LABELS: Record<ActionType, string> = {
  assign_department: 'Assign to Department',
  assign_agent: 'Assign to Agent',
  set_priority: 'Set Priority',
  escalate: 'Escalate',
  send_notification: 'Send Notification',
}

export interface RuleActionEditorProps {
  actions: RuleAction[]
  onChange: (actions: RuleAction[]) => void
  departments: Department[]
  agents: User[]
  priorities: TicketPriority[]
}

export function RuleActionEditor({ actions, onChange, departments, agents, priorities }: RuleActionEditorProps) {
  function updateRow(index: number, patch: Partial<RuleAction>) {
    const next = actions.slice()
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  function addRow() {
    onChange([...actions, { type: 'assign_department', value: '' }])
  }

  function removeRow(index: number) {
    onChange(actions.filter((_, i) => i !== index))
  }

  function renderValueInput(action: RuleAction, index: number) {
    if (action.type === 'assign_department') {
      return (
        <SelectField value={String(action.value ?? '')} onChange={(e) => updateRow(index, { value: Number(e.target.value) })}>
          <option value="">Select department…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectField>
      )
    }
    if (action.type === 'assign_agent') {
      return (
        <SelectField value={String(action.value ?? '')} onChange={(e) => updateRow(index, { value: Number(e.target.value) })}>
          <option value="">Select agent…</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </SelectField>
      )
    }
    if (action.type === 'set_priority') {
      return (
        <SelectField value={String(action.value ?? '')} onChange={(e) => updateRow(index, { value: Number(e.target.value) })}>
          <option value="">Select priority…</option>
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
      )
    }
    if (action.type === 'escalate') {
      return <p className="pt-2 text-body-sm text-on-surface-variant">No value needed — escalates the ticket immediately.</p>
    }
    return (
      <TextField
        placeholder="Notification message (optional)"
        value={String(action.value ?? '')}
        onChange={(e) => updateRow(index, { value: e.target.value })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <span className="text-label-md uppercase tracking-wider text-secondary">Actions (run in order)</span>
        <button type="button" onClick={addRow} className="text-label-sm font-semibold text-primary hover:underline">
          + Add Action
        </button>
      </div>
      {actions.length === 0 && <p className="text-body-sm text-error">At least one action is required.</p>}
      {actions.map((action, index) => (
        <div key={index} className="grid grid-cols-1 items-end gap-space-sm rounded-lg bg-surface-container-low p-space-sm sm:grid-cols-[1fr_1fr_auto]">
          <SelectField
            label="Action"
            value={action.type}
            onChange={(e) => updateRow(index, { type: e.target.value as ActionType, value: '' })}
          >
            {ACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
          <div className="flex flex-col gap-1.5">
            <span className="text-label-md uppercase tracking-wider text-secondary">Value</span>
            {renderValueInput(action, index)}
          </div>
          <IconButton icon="delete" label="Remove action" onClick={() => removeRow(index)} />
        </div>
      ))}
    </div>
  )
}
