/** The exact field/operator/action-type enums come from StoreRoutingRuleRequest's validation rules. */
export const CONDITION_FIELDS = ['category_id', 'priority_id', 'customer_type', 'keyword'] as const
export type ConditionField = (typeof CONDITION_FIELDS)[number]

export const CONDITION_OPERATORS = ['=', '!=', 'in'] as const
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number]

export const ACTION_TYPES = ['assign_department', 'assign_agent', 'set_priority', 'escalate', 'send_notification'] as const
export type ActionType = (typeof ACTION_TYPES)[number]

export interface RuleCondition {
  field: ConditionField
  operator: ConditionOperator
  value: unknown
}

export interface RuleAction {
  type: ActionType
  value?: unknown
}

export interface RoutingRule {
  id: number
  name: string
  description: string | null
  priority: number
  isActive: boolean
  stopProcessing: boolean
  conditions: RuleCondition[]
  actions: RuleAction[]
  createdAt: string | null
  updatedAt: string | null
}

export interface RoutingRuleFormPayload {
  name: string
  description?: string
  priority?: number
  isActive?: boolean
  stopProcessing?: boolean
  conditions: RuleCondition[]
  actions: RuleAction[]
}
