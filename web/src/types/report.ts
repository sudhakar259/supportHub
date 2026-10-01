export interface TicketSummaryReport {
  totalTickets: number
  byStatus: { status: string; count: number }[]
  byPriority: { priority: string; count: number }[]
  byDepartment: { department: string; count: number }[]
}

export interface SlaComplianceReport {
  totalWithSla: number
  firstResponseBreached: number
  resolutionBreached: number
  firstResponseBreachRate: number
  resolutionBreachRate: number
}

export interface AgentPerformanceEntry {
  agentId: number
  agentName: string
  resolvedCount: number
}
