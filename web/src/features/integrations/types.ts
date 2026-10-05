import type { User } from '@/types/user'

/** Mirrors api/app/Models/ApiCredential.php::ALL_SCOPES — a fixed enum, not a DB-backed list. */
export type ApiCredentialScope =
  | 'customers.read'
  | 'customers.create'
  | 'customers.update'
  | 'tickets.read'
  | 'tickets.create'
  | 'tickets.update'
  | 'tickets.reply'
  | 'tickets.status.update'
  | 'tickets.attachments'

export type ApiCredentialStatus = 'active' | 'revoked'

export interface ApiCredential {
  id: number
  name: string
  key: string
  secretLastFour: string
  scopes: ApiCredentialScope[]
  status: ApiCredentialStatus
  creator: User | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string | null
}

export interface ApiCredentialFormPayload {
  name: string
  scopes: ApiCredentialScope[]
}

interface ScopeDescriptor {
  scope: ApiCredentialScope
  description: string
}

interface ScopeGroup {
  key: string
  label: string
  icon: string
  scopes: ScopeDescriptor[]
}

/**
 * Display grouping/descriptions for the fixed scope enum — UI copy we own,
 * not server data (the API has no scope-description endpoint).
 */
export const SCOPE_GROUPS: ScopeGroup[] = [
  {
    key: 'customers',
    label: 'Customers',
    icon: 'group',
    scopes: [
      { scope: 'customers.read', description: 'Retrieve customer profiles and metadata for this tenant.' },
      { scope: 'customers.create', description: 'Provision new customer records in this tenant.' },
      { scope: 'customers.update', description: 'Modify existing customer details.' },
    ],
  },
  {
    key: 'tickets',
    label: 'Tickets',
    icon: 'confirmation_number',
    scopes: [
      { scope: 'tickets.read', description: 'Retrieve tickets and their status for this tenant.' },
      { scope: 'tickets.create', description: 'Open new support tickets on behalf of customers.' },
      { scope: 'tickets.update', description: 'Modify ticket subject, description, category, or priority.' },
      { scope: 'tickets.reply', description: 'Post customer replies into ticket threads.' },
      { scope: 'tickets.status.update', description: 'Change ticket status (e.g. resolve, reopen).' },
      { scope: 'tickets.attachments', description: 'Upload and download ticket attachments.' },
    ],
  },
]
