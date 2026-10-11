export type MarketingTone = 'primary' | 'teal' | 'blue' | 'violet' | 'navy'

// Stable topics, icons and plan identities keep their colors across the public site.
const TOPIC_TONES: Record<string, MarketingTone> = {
  ticketing: 'primary',
  'email-ticketing': 'blue',
  'helpdesk-automation': 'teal',
  'sla-management': 'primary',
  'team-collaboration': 'violet',
  reports: 'navy',
  'api-webhooks': 'blue',
  support_agent: 'primary',
  dns: 'teal',
  code: 'blue',
  domain: 'navy',
  admin_panel_settings: 'violet',
  phonelink_lock: 'teal',
  key: 'blue',
  history: 'navy',
  manage_accounts: 'violet',
  add_business: 'primary',
  forward_to_inbox: 'blue',
  task_alt: 'teal',
  inbox: 'primary',
  alt_route: 'teal',
  timer: 'primary',
  data_object: 'blue',
  language: 'blue',
  webhook: 'teal',
  shield: 'navy',
  mail: 'blue',
  starter: 'teal',
  professional: 'primary',
  business: 'violet',
  enterprise: 'navy',
}

export function marketingTone(topic: string): MarketingTone {
  return TOPIC_TONES[topic] ?? 'primary'
}
