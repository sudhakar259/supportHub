import { IconButton } from '@/components/ui/IconButton'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { CONDITION_FIELDS, CONDITION_OPERATORS } from '@/types/routingRule'
import type { ConditionField, RuleCondition } from '@/types/routingRule'
import type { TicketCategory, TicketPriority } from '@/types/ticket'

const FIELD_LABELS: Record<ConditionField, string> = {
  category_id: 'Category',
  priority_id: 'Priority',
  customer_type: 'Customer Type',
  keyword: 'Keyword (subject/description)',
}

const CUSTOMER_TYPES = ['individual', 'business', 'vip']

export interface RuleConditionEditorProps {
  conditions: RuleCondition[]
  onChange: (conditions: RuleCondition[]) => void
  categories: TicketCategory[]
  priorities: TicketPriority[]
}

export function RuleConditionEditor({ conditions, onChange, categories, priorities }: RuleConditionEditorProps) {
  function updateRow(index: number, patch: Partial<RuleCondition>) {
    const next = conditions.slice()
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  function addRow() {
    onChange([...conditions, { field: 'category_id', operator: '=', value: '' }])
  }

  function removeRow(index: number) {
    onChange(conditions.filter((_, i) => i !== index))
  }

  function renderValueInput(condition: RuleCondition, index: number) {
    if (condition.field === 'category_id') {
      return (
        <SelectField value={String(condition.value ?? '')} onChange={(e) => updateRow(index, { value: Number(e.target.value) })}>
          <option value="">Select category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
      )
    }
    if (condition.field === 'priority_id') {
      return (
        <SelectField value={String(condition.value ?? '')} onChange={(e) => updateRow(index, { value: Number(e.target.value) })}>
          <option value="">Select priority…</option>
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
      )
    }
    if (condition.field === 'customer_type') {
      return (
        <SelectField value={String(condition.value ?? '')} onChange={(e) => updateRow(index, { value: e.target.value })}>
          <option value="">Select type…</option>
          {CUSTOMER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
      )
    }
    return (
      <TextField
        placeholder="e.g. refund"
        value={String(condition.value ?? '')}
        onChange={(e) => updateRow(index, { value: e.target.value })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <span className="text-label-md uppercase tracking-wider text-secondary">Conditions (all must match)</span>
        <button type="button" onClick={addRow} className="text-label-sm font-semibold text-primary hover:underline">
          + Add Condition
        </button>
      </div>
      {conditions.length === 0 && <p className="text-body-sm text-error">At least one condition is required.</p>}
      {conditions.map((condition, index) => (
        <div key={index} className="grid grid-cols-1 items-end gap-space-sm rounded-lg bg-surface-container-low p-space-sm sm:grid-cols-[1fr_120px_1fr_auto]">
          <SelectField
            label="Field"
            value={condition.field}
            onChange={(e) => updateRow(index, { field: e.target.value as ConditionField, value: '' })}
          >
            {CONDITION_FIELDS.map((field) => (
              <option key={field} value={field}>
                {FIELD_LABELS[field]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Operator" value={condition.operator} onChange={(e) => updateRow(index, { operator: e.target.value as RuleCondition['operator'] })}>
            {CONDITION_OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </SelectField>
          <div className="flex flex-col gap-1.5">
            <span className="text-label-md uppercase tracking-wider text-secondary">Value</span>
            {renderValueInput(condition, index)}
          </div>
          <IconButton icon="delete" label="Remove condition" onClick={() => removeRow(index)} />
        </div>
      ))}
    </div>
  )
}
