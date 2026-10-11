import { apiDownloadFile, apiFetch } from '@/services/api/client'
import type { AgentPerformanceEntry, SlaComplianceReport, TicketSummaryReport } from '@/types/report'

interface RawTicketSummaryReport {
  total_tickets: number
  by_status: { status: string; count: number }[]
  by_priority: { priority: string; count: number }[]
  by_department: { department: string; count: number }[]
}

interface RawSlaComplianceReport {
  total_with_sla: number
  first_response_breached: number
  resolution_breached: number
  first_response_breach_rate: number
  resolution_breach_rate: number
}

interface RawAgentPerformanceEntry {
  agent_id: number
  agent_name: string
  resolved_count: number
}

/** Maps 1:1 to api/routes/api/reports.php — see ReportController.php for the exact contract. */
export const reportsApi = {
  async ticketSummary(): Promise<TicketSummaryReport> {
    const raw = await apiFetch<RawTicketSummaryReport>('/reports/tickets-summary')
    return { totalTickets: raw.total_tickets, byStatus: raw.by_status, byPriority: raw.by_priority, byDepartment: raw.by_department }
  },

  async slaCompliance(): Promise<SlaComplianceReport> {
    const raw = await apiFetch<RawSlaComplianceReport>('/reports/sla-compliance')
    return {
      totalWithSla: raw.total_with_sla,
      firstResponseBreached: raw.first_response_breached,
      resolutionBreached: raw.resolution_breached,
      firstResponseBreachRate: raw.first_response_breach_rate,
      resolutionBreachRate: raw.resolution_breach_rate,
    }
  },

  async agentPerformance(): Promise<AgentPerformanceEntry[]> {
    const raw = await apiFetch<RawAgentPerformanceEntry[]>('/reports/agent-performance')
    return raw.map((r) => ({ agentId: r.agent_id, agentName: r.agent_name, resolvedCount: r.resolved_count }))
  },

  /** CSV of the tickets you can see, optionally limited by creation date (YYYY-MM-DD). Needs reports.view. */
  async exportTicketsCsv(range: { from?: string; to?: string } = {}): Promise<void> {
    await apiDownloadFile('/exports/tickets', 'tickets.csv', { from: range.from || undefined, to: range.to || undefined })
  },
}
