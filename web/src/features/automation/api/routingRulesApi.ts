import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { RoutingRule, RoutingRuleFormPayload, RuleAction, RuleCondition } from '@/types/routingRule'

interface RawRoutingRule {
  id: number
  name: string
  description: string | null
  priority: number
  is_active: boolean
  stop_processing: boolean
  conditions: RuleCondition[]
  actions: RuleAction[]
  created_at: string | null
  updated_at: string | null
}

function mapRoutingRule(raw: RawRoutingRule): RoutingRule {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    priority: raw.priority,
    isActive: raw.is_active,
    stopProcessing: raw.stop_processing,
    conditions: raw.conditions ?? [],
    actions: raw.actions ?? [],
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function toBody(payload: Partial<RoutingRuleFormPayload>) {
  return {
    name: payload.name,
    description: payload.description,
    priority: payload.priority,
    is_active: payload.isActive,
    stop_processing: payload.stopProcessing,
    conditions: payload.conditions,
    actions: payload.actions,
  }
}

/** Maps 1:1 to api/routes/api/routing.php — see TicketRoutingRuleController.php for the exact contract. */
export const routingRulesApi = {
  async list(): Promise<RoutingRule[]> {
    const page = await apiFetchPage<RawRoutingRule, RoutingRule>('/routing-rules', mapRoutingRule)
    return page.items
  },

  async create(payload: RoutingRuleFormPayload): Promise<RoutingRule> {
    const raw = await apiFetch<RawRoutingRule>('/routing-rules', { method: 'POST', body: toBody(payload) })
    return mapRoutingRule(raw)
  },

  async update(id: number, payload: Partial<RoutingRuleFormPayload>): Promise<RoutingRule> {
    const raw = await apiFetch<RawRoutingRule>(`/routing-rules/${id}`, { method: 'PUT', body: toBody(payload) })
    return mapRoutingRule(raw)
  },

  async destroy(id: number): Promise<void> {
    await apiFetch<null>(`/routing-rules/${id}`, { method: 'DELETE' })
  },
}
