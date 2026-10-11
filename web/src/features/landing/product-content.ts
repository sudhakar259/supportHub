export interface ContentSection {
  title: string
  body: string
  bullets?: string[]
}

export interface ProductPageContent {
  slug: string
  label: string
  icon: string
  title: string
  description: string
  intro: string
  sections: ContentSection[]
  related: string[]
}

/** Public promises are tied to the shipped ticket, routing, SLA and integration APIs. */
export const FEATURE_PAGES: ProductPageContent[] = [
  {
    slug: 'ticketing', label: 'Ticketing', icon: 'confirmation_number',
    title: 'Helpdesk ticketing. Every detail, together.',
    description: 'Manage customer support tickets with DeskZeal. Assign owners, send replies, add private notes and attachments, and track every request to resolution.',
    intro: 'One request, one owner, a clear next step. Keep messages, attachments and customer context together from first reply to resolution.',
    sections: [
      { title: 'Keep context attached to the request', body: 'Open a ticket to follow its conversation and review the customer behind it. Public replies keep customers informed; internal notes let teammates discuss the issue privately.', bullets: ['Customer messages and staff replies in one thread', 'Private notes visible to staff with the appropriate access', 'Attachments and a record of ticket activity'] },
      { title: 'Manage the full ticket lifecycle', body: 'Assign or reassign a request, escalate an issue when it needs more attention, and resolve it when the work is complete. Closing and reopening are separate actions, so a follow-up has a clear history.', bullets: ['Assignment history and escalation activity', 'Resolve, close and reopen workflows', 'Configurable statuses, priorities, categories, tags and ticket numbers'] },
      { title: 'Let customers follow their own requests', body: 'Customer accounts can sign in to create, view and reply to their own tickets. Their view excludes private staff notes. Your team can also receive requests through configured inbound email or the integration API.' },
    ], related: ['email-ticketing', 'team-collaboration', 'sla-management'],
  },
  {
    slug: 'email-ticketing', label: 'Email to ticket', icon: 'forward_to_inbox',
    title: 'Email to ticket. A clearer support inbox.',
    description: 'Turn support emails into DeskZeal tickets with Mailgun inbound routing. Thread customer replies, review incoming email logs and customize notifications.',
    intro: 'Customers keep using email. Your team gets an organized queue, clear ownership and replies that stay with the right conversation.',
    sections: [
      { title: 'Bring your support mailbox into the queue', body: 'After the service operator configures Mailgun inbound routing, each workspace can enable email intake and forward its support mailbox to its workspace-specific inbound address.', bullets: ['New incoming messages create support tickets', 'Choose whether unknown senders can create customer records', 'Review recent incoming emails and processing outcomes'] },
      { title: 'Keep replies with the right conversation', body: 'DeskZeal uses email threading headers or ticket references to match a customer reply to that customer’s ticket. Replies to resolved requests reopen the conversation. Replies to closed tickets create a follow-up ticket.', bullets: ['Customer identity is checked before a message joins a thread', 'Duplicate deliveries and automatic replies are handled to avoid repeated tickets and loops', 'Supported attachments follow the configured file limits'] },
      { title: 'Send updates with your workspace identity', body: 'Editable notification templates let administrators adjust outgoing messages. Workspace sender names, reply-to addresses and signatures keep customer communication recognizable. Sending from a workspace’s own domain requires the applicable plan and operator verification.' },
    ], related: ['ticketing', 'helpdesk-automation', 'team-collaboration'],
  },
  {
    slug: 'helpdesk-automation', label: 'Routing automation', icon: 'alt_route',
    title: 'Helpdesk automation. Less sorting, clearer ownership.',
    description: 'Route new DeskZeal tickets by category, priority, customer type or keywords. Set department ownership and distribute work with workload-based assignment.',
    intro: 'Route new tickets with rules you control. Match the request to a department, then share work across eligible agents by open workload.',
    sections: [
      { title: 'Define the requests each team handles', body: 'Build rules around ticket category, priority, customer type or keywords in the subject and description. All conditions in a rule must match before its actions run.', bullets: ['Assign a department or a specific agent', 'Set priority, escalate or send a configured notification', 'Order rules and stop further processing after a match'] },
      { title: 'Distribute tickets by current workload', body: 'When a ticket has a department but no specific agent, automatic assignment selects an eligible Agent or Senior Agent with the fewest open tickets in that department. A queue without eligible agents keeps the ticket unassigned for staff to review.' },
      { title: 'Keep manual control when circumstances change', body: 'Staff with permission can reassign or escalate an existing ticket. Its activity history records the handoff, so a new owner can understand what happened before taking over.' },
    ], related: ['ticketing', 'sla-management', 'reports'],
  },
  {
    slug: 'sla-management', label: 'SLA management', icon: 'timer',
    title: 'Helpdesk SLA management. Keep targets in sight.',
    description: 'Set first-response and resolution SLA targets in DeskZeal, account for configured business hours, and review breaches and compliance reports.',
    intro: 'Set response and resolution targets by priority. Follow deadlines, working hours and overdue requests in the same support workflow.',
    sections: [
      { title: 'Set targets that match ticket urgency', body: 'Configure first-response and resolution targets by priority. Use the policy’s business-hours option when deadlines should count only the workspace’s configured working schedule.', bullets: ['Separate response and resolution targets', 'Configurable working hours and timezone', 'Ticket deadlines and recorded SLA breaches'] },
      { title: 'Review performance alongside the conversation', body: 'Agents can use the ticket’s priority and deadlines to decide what needs attention. The scheduled breach checker flags overdue requests; notification behavior follows the service’s configured templates and dispatch settings.' },
      { title: 'Use compliance reports to improve the process', body: 'Review SLA compliance with ticket volume and agent performance reports. A missed target is a useful prompt to examine staffing, routing and the target itself. DeskZeal tracks these measures; it does not guarantee a response time on your team’s behalf.' },
    ], related: ['helpdesk-automation', 'reports', 'ticketing'],
  },
  {
    slug: 'team-collaboration', label: 'Team collaboration', icon: 'groups',
    title: 'Team collaboration. Smoother support handoffs.',
    description: 'Organize DeskZeal agents into departments, manage role-based permissions and share customer context through ticket history, private notes and assignments.',
    intro: 'Give the next teammate the full story. Departments, permissions and private notes keep responsibility clear and customer context close.',
    sections: [
      { title: 'Organize your support operation', body: 'Create departments for the work your teams handle and manage their membership. Administrators can assign roles and permissions for ticket work, customer records, reports and workspace settings.' },
      { title: 'Share useful context before handing off', body: 'Customer profiles and ticket history help a teammate understand earlier requests. Add a private note before reassigning a ticket, and review assignment activity when responsibility changes.', bullets: ['Customer profiles and previous tickets', 'Staff-only internal notes', 'Assignment and escalation history'] },
      { title: 'Keep each workspace’s boundaries clear', body: 'Each organization has its own tickets, customers, team, settings and integrations. Within a workspace, role-based and department-scoped access determines which requests a person can work on.' },
    ], related: ['ticketing', 'helpdesk-automation', 'reports'],
  },
  {
    slug: 'reports', label: 'Support reporting', icon: 'monitoring',
    title: 'Support reports. See what needs attention.',
    description: 'Review DeskZeal ticket summaries, agent performance, SLA compliance and audit history to understand workload and improve your customer support operation.',
    intro: 'See ticket volume, agent performance and SLA compliance. Use your support history to make the next process change an informed one.',
    sections: [
      { title: 'Understand the queue before changing the process', body: 'Use the ticket summary to review incoming volume and status distribution. Look for work that remains open and compare it with how your team handles assignments and escalations.' },
      { title: 'Review agent performance and service targets', body: 'Agent performance and SLA compliance reports provide separate views of support delivery. Use both when reviewing workload and service goals rather than judging an agent from a single count.' },
      { title: 'Trace important changes', body: 'Authorized staff can inspect the audit history for actions affecting their workspace. This complements the ticket activity timeline when you need to understand an administrative change or a support handoff.' },
    ], related: ['sla-management', 'helpdesk-automation', 'team-collaboration'],
  },
  {
    slug: 'api-webhooks', label: 'API & webhooks', icon: 'data_object',
    title: 'Helpdesk API & webhooks. Keep your tools connected.',
    description: 'Connect your application to DeskZeal with scoped API credentials. Manage customers, create tickets, post replies and receive signed ticket event webhooks.',
    intro: 'Create tickets and send replies from your own backend. Signed webhooks keep your connected systems informed when a ticket changes.',
    sections: [
      { title: 'Connect the workflows your customers already use', body: 'Your server can create customers and tickets, send replies and attach supported files through the integration API. This gives you the building blocks for a support experience inside your own application.', bullets: ['Workspace-scoped integration credentials', 'Scopes that limit allowed operations', 'Credential rotation and per-credential request limits'] },
      { title: 'Receive signed ticket events', body: 'Configure webhook subscriptions for ticket events and verify the signature in your receiving application. Delivery history and retries help your team diagnose a receiving endpoint that is temporarily unavailable.' },
      { title: 'Keep secrets on your server', body: 'Integration credentials belong in your backend, rather than in a browser bundle. API access and webhook allowances follow the selected plan. DeskZeal provides the API; your team implements and hosts the customer-facing integration.' },
    ], related: ['ticketing', 'email-ticketing', 'team-collaboration'],
  },
]

export interface GuideContent {
  slug: string
  title: string
  headline: string
  description: string
  category: string
  intro: string
  sections: ContentSection[]
  featureSlug: string
}

export const GUIDES: GuideContent[] = [
  {
    slug: 'email-to-ticket-guide', category: 'Email support',
    title: 'How to turn a shared support mailbox into a ticket queue',
    headline: 'Email to ticket, step by step.',
    description: 'A practical DeskZeal guide to email ticketing: prepare inbound email, connect a workspace mailbox, test reply threading and review processing logs.',
    intro: 'Give support emails an owner and a clear history. Follow five steps to connect your mailbox, test reply threading and review incoming messages.',
    featureSlug: 'email-ticketing',
    sections: [
      { title: '1. Prepare the inbound email service', body: 'The service operator configures a Mailgun receiving domain, DNS records, a signed inbound route and DeskZeal’s inbound email settings. This is an operator setup step; forwarding a mailbox alone does not activate email ticketing.' },
      { title: '2. Connect the workspace mailbox', body: 'In your workspace’s Settings, open Email to ticket, enable intake and copy the workspace-specific inbound address. Configure your existing support mailbox to forward messages to that address. If your mail provider sends a forwarding confirmation, complete that confirmation before sending customer traffic.' },
      { title: '3. Decide how to handle new senders', body: 'Choose whether an unknown sender should create a customer record or be rejected. Use the setting that fits your support operation: an open product support address and a restricted internal mailbox may need different rules.' },
      { title: '4. Test a complete conversation', body: 'Send a test request from a customer address and check that a ticket appears. Reply as an agent, then answer that notification from the same customer mailbox. The answer should join the existing ticket. Test supported attachments and check that private team notes stay inside the staff workspace.' },
      { title: '5. Review exceptions before expanding', body: 'Use Recent emails to inspect processing outcomes. Automatic replies and staff senders are ignored to reduce loops; plan limits can reject new records. A reply to a resolved ticket reopens it, while a reply to a closed ticket starts a follow-up. Make these outcomes part of your team’s support process.' },
    ],
  },
  {
    slug: 'helpdesk-sla-guide', category: 'Service delivery',
    title: 'How to set practical helpdesk SLA targets',
    headline: 'Set practical helpdesk SLA targets.',
    description: 'Plan first-response and resolution targets, define business hours and review SLA breaches using the policies and reports available in DeskZeal.',
    intro: 'Set targets your team can work with. Define priorities and business hours, then use deadlines and compliance reports to improve service.',
    featureSlug: 'sla-management',
    sections: [
      { title: '1. Separate acknowledgement from resolution', body: 'First response measures when an agent responds to the customer. Resolution measures when the ticket’s work is resolved. Keep these targets separate: a quick acknowledgement can be valuable even when investigating a problem takes longer.' },
      { title: '2. Define what each priority means', body: 'Agree on the kinds of requests that belong in each priority before setting minute-based targets. An unavailable service and a general product question should not compete on the same urgency. Use consistent priority definitions when creating tickets and routing rules.' },
      { title: '3. Set the working schedule', body: 'Configure business hours and timezone, then choose the business-hours option on policies that should count only working time. Calendar-time targets need staffing that matches that promise. DeskZeal calculates deadlines from the policy; the team remains responsible for meeting them.' },
      { title: '4. Review tickets and breach flags', body: 'Use the ticket’s deadlines alongside ownership and priority when deciding what to work on next. The service operator must run the scheduler for automated breach checks. Confirm that your notification templates and dispatch settings match how your team wants to receive updates.' },
      { title: '5. Improve the process using reports', body: 'Review SLA compliance together with volume and agent workload. Repeated misses can point to routing issues, staffing gaps or unrealistic targets. Start with a small set of clear policies and adjust them using your actual support history.' },
    ],
  },
  {
    slug: 'ticket-routing-guide', category: 'Team workflows',
    title: 'How to organize ticket routing across support departments',
    headline: 'Build your ticket routing workflow.',
    description: 'Build a clear DeskZeal routing workflow with departments, ordered rules, workload-based assignment and a review process for unassigned tickets.',
    intro: 'Give each new request a clear destination. Set up departments, ordered routing rules and workload-based assignment, with a plan for exceptions.',
    featureSlug: 'helpdesk-automation',
    sections: [
      { title: '1. Define departments around responsibility', body: 'Start with the teams that actually handle different work, such as Billing and Technical Support. Add eligible Agent or Senior Agent members. Administrators and department managers do not automatically join the frontline assignment pool just because they have broader access.' },
      { title: '2. Build specific rules before broad rules', body: 'Match category, priority, customer type or keywords. DeskZeal requires all conditions on a rule to match. Give specific rules an earlier order and use stop processing when a matched rule should prevent later rules from changing the result.' },
      { title: '3. Decide when to assign an agent explicitly', body: 'A rule can name a particular agent or assign a department. When only the department is set, DeskZeal chooses an eligible agent with the fewest open tickets. Explicit agent assignment takes precedence over this workload-based selection.' },
      { title: '4. Give exceptions a review owner', body: 'A department with no eligible agents leaves new tickets unassigned. Make checking that queue part of a team member’s routine. Staff with permission can manually assign, reassign or escalate a request when the initial route is no longer appropriate.' },
      { title: '5. Test with representative requests', body: 'Create test tickets covering your common categories and priorities. Check the department, agent, priority and activity history, then review real ticket summaries over time. Routing rules run at ticket creation; editing a rule does not reroute every existing ticket.' },
    ],
  },
]
