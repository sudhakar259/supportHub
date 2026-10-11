import { apiFetch } from '@/services/api/client'

export interface InboundEmailRow {
  id: number
  fromEmail: string
  fromName: string | null
  subject: string | null
  status: string
  ticketId: string | null
  attachmentsSaved: number
  attachmentsSkipped: number
  note: string | null
  receivedAt: string
}

export interface InboundEmailState {
  /** False until the platform has an inbound domain configured. */
  available: boolean
  address: string | null
  enabled: boolean
  createCustomers: boolean
  recent: InboundEmailRow[]
}

interface RawRow {
  id: number
  from_email: string
  from_name: string | null
  subject: string | null
  status: string
  ticket_id: string | null
  attachments_saved: number
  attachments_skipped: number
  note: string | null
  received_at: string
}

interface RawState {
  available: boolean
  address: string | null
  enabled: boolean
  create_customers: boolean
  recent: RawRow[]
}

function mapState(raw: RawState): InboundEmailState {
  return {
    available: raw.available,
    address: raw.address,
    enabled: raw.enabled,
    createCustomers: raw.create_customers,
    recent: raw.recent.map((r) => ({
      id: r.id,
      fromEmail: r.from_email,
      fromName: r.from_name,
      subject: r.subject,
      status: r.status,
      ticketId: r.ticket_id,
      attachmentsSaved: r.attachments_saved,
      attachmentsSkipped: r.attachments_skipped,
      note: r.note,
      receivedAt: r.received_at,
    })),
  }
}

/** Maps 1:1 to api/routes/api/inbound-email.php — see InboundEmailController.php for the contract. */
export const inboundEmailApi = {
  async get(): Promise<InboundEmailState> {
    return mapState(await apiFetch<RawState>('/inbound-email'))
  },

  async update(payload: { enabled: boolean; createCustomers: boolean }): Promise<InboundEmailState> {
    return mapState(await apiFetch<RawState>('/inbound-email', { method: 'PUT', body: { enabled: payload.enabled, create_customers: payload.createCustomers } }))
  },
}
