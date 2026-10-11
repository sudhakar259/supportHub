export const PRODUCT_FEATURES = [
  {
    id: 'tickets',
    icon: 'confirmation_number',
    label: 'Ticketing',
    title: 'One conversation. The whole story.',
    description:
      'Keep customer messages, attachments, internal notes and assignment history together. Move each request from its first reply to resolution without losing the context.',
    details: [
      'Assign, escalate, resolve, close and reopen tickets',
      'Public replies and private team notes',
      'Custom statuses, priorities, categories and ticket numbers',
    ],
  },
  {
    id: 'email',
    icon: 'forward_to_inbox',
    label: 'Email intake',
    title: 'Your support inbox, organized.',
    description:
      'Turn incoming email into tickets. Replies join the existing conversation, so your customers can keep using email while your team works from a shared queue.',
    details: [
      'Mailgun inbound email integration',
      'Thread customer replies into existing tickets',
      'Editable email notification templates',
    ],
  },
  {
    id: 'automation',
    icon: 'alt_route',
    label: 'Routing & SLAs',
    title: 'Give every request a next step.',
    description:
      'Route tickets by the conditions you define, assign work across your team and track first-response and resolution deadlines by priority.',
    details: [
      'Condition-based department and agent routing',
      'Workload-based automatic assignment',
      'Business hours, SLA targets and breach tracking',
    ],
  },
  {
    id: 'team',
    icon: 'groups',
    label: 'Team collaboration',
    title: 'The right people, working together.',
    description:
      'Organize support into departments and give each person the permissions they need. Customer profiles and private notes help your team pick up where a teammate left off.',
    details: [
      'Departments and role-based permissions',
      'Customer profiles and conversation history',
      'Internal notes and assignment activity',
    ],
  },
  {
    id: 'reports',
    icon: 'monitoring',
    label: 'Reporting',
    title: 'See where your support needs attention.',
    description:
      'Follow ticket volume, agent performance and SLA compliance. Use the audit log to understand who changed what in your workspace.',
    details: ['Ticket volume and status reports', 'Agent performance and SLA compliance', 'Searchable audit history'],
  },
  {
    id: 'integrations',
    icon: 'data_object',
    label: 'API & webhooks',
    title: 'Make support part of your product.',
    description:
      'Connect your own website or backend to customer records and ticket conversations. Signed webhooks keep your systems informed when a ticket changes.',
    details: [
      'Scoped API credentials and secret rotation',
      'Create tickets, send replies and attach files',
      'Signed webhooks with delivery history and retries',
    ],
  },
] as const

export const SOLUTIONS = [
  {
    icon: 'support_agent',
    title: 'Customer support teams',
    audience: 'Keep every customer in the loop',
    description:
      'Bring incoming requests into one queue, give each ticket an owner and keep the conversation moving with replies, notes and attachments.',
    features: ['Shared ticket queue', 'Customer profiles', 'Email notifications'],
    example:
      'A customer emails about an invoice. The ticket reaches Billing, an agent replies, and the full conversation stays together.',
  },
  {
    icon: 'dns',
    title: 'IT & service teams',
    audience: 'Bring structure to incoming requests',
    description:
      'Separate requests by department, prioritize urgent issues and track response and resolution targets with configurable SLA policies.',
    features: ['Priorities and categories', 'Department routing', 'SLA tracking'],
    example:
      'An access request is routed to IT. The agent can see its priority, deadline and assignment history before responding.',
  },
  {
    icon: 'code',
    title: 'Software & product teams',
    audience: 'Connect support to your application',
    description:
      'Use the integration API to offer ticket creation and replies from your own product, then listen for ticket events through signed webhooks.',
    features: ['Integration API', 'Scoped credentials', 'Signed webhooks'],
    example:
      'A user submits an issue inside your app. Your server opens a SupportHub ticket, and a webhook tells your app when an agent replies.',
  },
] as const

export const HOME_FAQ = [
  {
    question: 'Can I try SupportHub before creating a workspace?',
    answer:
      'Yes. The interactive product tour uses sample tickets to show conversations, private notes, routing and reports. You can explore it without signing in.',
  },
  {
    question: 'Is there a free plan?',
    answer:
      'The Starter plan is free. Paid plans begin with a 14-day trial. Visit the pricing page for the current prices and usage limits configured for this service.',
  },
  {
    question: 'Can customers send requests by email?',
    answer:
      'Yes. Administrators can configure Mailgun inbound email so new emails create tickets and replies join the existing thread. Your team can also customize outgoing email notifications.',
  },
  {
    question: 'Can I connect my own website?',
    answer:
      'Yes. Your server can use scoped API credentials to manage customers, create tickets and post replies. Signed webhooks notify your application about ticket events.',
  },
  {
    question: 'How are workspaces kept separate?',
    answer:
      'Tickets, customers, team members and integrations belong to an organization. Role-based permissions control access within that workspace, and internal notes are hidden from customers.',
  },
  {
    question: 'Can I change plans as my team grows?',
    answer:
      'Yes. Manage your subscription from the billing page. Plans differ by usage limits, including team size, customers, tickets, departments, API requests and webhooks.',
  },
]
