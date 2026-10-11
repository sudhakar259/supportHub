import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'

interface DemoMessage {
  author: string
  body: string
  internal?: boolean
}
interface DemoTicket {
  id: string
  subject: string
  name: string
  initials: string
  department: string
  priority: string
  body: string
  status: 'Open' | 'Resolved'
  messages: DemoMessage[]
}

const SAMPLE_TICKETS: DemoTicket[] = [
  {
    id: 'SH-1042',
    subject: 'Help with my latest invoice',
    name: 'Jamie Rivera',
    initials: 'JR',
    department: 'Billing',
    priority: 'High',
    body: 'Hi team! I upgraded our workspace yesterday, but the invoice still shows our previous plan. Could you help me check it?',
    status: 'Open',
    messages: [
      {
        author: 'Alex Morgan',
        body: 'Hi Jamie, thanks for reaching out. I’m checking the plan change and invoice with our billing team.',
      },
    ],
  },
  {
    id: 'SH-1041',
    subject: 'I can’t reset my password',
    name: 'Sam Chen',
    initials: 'SC',
    department: 'Technical support',
    priority: 'Urgent',
    body: 'The reset link in my email has expired. Can you help me get back into my account?',
    status: 'Open',
    messages: [],
  },
  {
    id: 'SH-1039',
    subject: 'Adding a teammate to our workspace',
    name: 'Taylor Brooks',
    initials: 'TB',
    department: 'Customer success',
    priority: 'Normal',
    body: 'Where can I add a new agent and choose their department? We have a new teammate starting this week.',
    status: 'Open',
    messages: [],
  },
]

const INITIAL_RULES = [
  {
    name: 'Send invoice questions to Billing',
    condition: 'Subject contains “invoice”',
    action: 'Assign department → Billing',
    icon: 'receipt_long',
    active: true,
  },
  {
    name: 'Prioritize urgent technical requests',
    condition: 'Priority is Urgent',
    action: 'Assign department → Technical support',
    icon: 'priority_high',
    active: true,
  },
  {
    name: 'Share new work across available agents',
    condition: 'Ticket has no assigned agent',
    action: 'Auto-assign by agent workload',
    icon: 'groups',
    active: true,
  },
]

/** A browser-local tour. It never reads or writes workspace data. */
export function DemoWorkspace({ compact = false }: { compact?: boolean }) {
  const [tickets, setTickets] = useState(() => structuredClone(SAMPLE_TICKETS))
  const [selectedId, setSelectedId] = useState(SAMPLE_TICKETS[0].id)
  const [view, setView] = useState<'inbox' | 'routing' | 'reports'>('inbox')
  const [draft, setDraft] = useState('')
  const [isNote, setIsNote] = useState(false)
  const [customerView, setCustomerView] = useState(false)
  const [rules, setRules] = useState(INITIAL_RULES)
  const [announcement, setAnnouncement] = useState('')
  const ticket = tickets.find((item) => item.id === selectedId)!
  const resolvedCount = tickets.filter((item) => item.status === 'Resolved').length

  function reset() {
    setTickets(structuredClone(SAMPLE_TICKETS))
    setSelectedId(SAMPLE_TICKETS[0].id)
    setView('inbox')
    setDraft('')
    setIsNote(false)
    setCustomerView(false)
    setRules(INITIAL_RULES)
    setAnnouncement('Demo reset. All sample tickets are open again.')
  }

  function sendMessage() {
    if (!draft.trim()) return
    setTickets((items) =>
      items.map((item) =>
        item.id === selectedId
          ? { ...item, messages: [...item.messages, { author: 'You', body: draft.trim(), internal: isNote }] }
          : item,
      ),
    )
    setAnnouncement(
      isNote
        ? 'Private note added. It is only visible in the agent view.'
        : `Reply added to ${ticket.id}. This demo does not send email.`,
    )
    setDraft('')
  }

  function toggleStatus() {
    const status = ticket.status === 'Open' ? 'Resolved' : 'Open'
    setTickets((items) => items.map((item) => (item.id === selectedId ? { ...item, status } : item)))
    setAnnouncement(
      `${ticket.id} ${status === 'Resolved' ? 'resolved' : 'reopened'}. The sample report has been updated.`,
    )
  }

  return (
    <div className={`demo-workspace${compact ? ' demo-compact' : ''}`}>
      <div className="demo-window-bar">
        <span className="demo-window-dots">
          <i />
          <i />
          <i />
        </span>
        <span>SupportHub / Sample workspace</span>
        <span className="demo-sample-tag">SAMPLE DATA</span>
      </div>
      <div className="demo-app">
        <aside className="demo-sidebar">
          <span className="demo-workspace-brand">
            <Icon name="support_agent" size={21} />
            <span>Acme support</span>
          </span>
          <span className="demo-sidebar-label">WORKSPACE</span>
          <nav aria-label={compact ? 'Preview navigation' : 'Demo navigation'}>
            {(
              [
                { id: 'inbox', label: 'Inbox', icon: 'inbox' },
                { id: 'routing', label: 'Routing', icon: 'alt_route' },
                { id: 'reports', label: 'Reports', icon: 'monitoring' },
              ] as const
            ).map((item) => (
              <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)}>
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                {item.id === 'inbox' && <b>{tickets.length - resolvedCount}</b>}
              </button>
            ))}
          </nav>
          <div className="demo-sidebar-user">
            <span className="demo-avatar">AM</span>
            <span>
              Alex Morgan<small>Support agent</small>
            </span>
          </div>
        </aside>
        <div className="demo-content">
          <div className="demo-page-header">
            <div>
              <span className="demo-breadcrumb">WORKSPACE / {view.toUpperCase()}</span>
              <h2>
                {view === 'inbox'
                  ? 'Your team’s inbox'
                  : view === 'routing'
                    ? 'A little less manual work'
                    : 'Your support at a glance'}
              </h2>
            </div>
            {!compact && (
              <button type="button" className="demo-reset" onClick={reset}>
                <Icon name="restart_alt" size={17} />
                Reset demo
              </button>
            )}
          </div>
          {view === 'inbox' && (
            <>
              <div className="demo-queue-summary">
                <span>
                  <i className="demo-status-dot" />
                  {tickets.length - resolvedCount} open tickets
                </span>
                <span>
                  <Icon name="timer" size={15} />
                  SLA deadlines tracked
                </span>
                <span>
                  <Icon name="groups" size={15} />3 departments
                </span>
              </div>
              <div className="demo-inbox-grid">
                <div className="demo-ticket-list" aria-label="Sample tickets">
                  {tickets.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={selectedId === item.id ? 'is-selected' : ''}
                      aria-pressed={selectedId === item.id}
                      onClick={() => {
                        setSelectedId(item.id)
                        setDraft('')
                        setAnnouncement('')
                      }}
                    >
                      <div>
                        <span className={`demo-avatar demo-avatar-${item.initials}`}>{item.initials}</span>
                        <span>
                          {item.name}
                          <small>
                            {item.id} · {item.department}
                          </small>
                        </span>
                      </div>
                      <strong>{item.subject}</strong>
                      <p>{item.body}</p>
                      <span className={`demo-priority demo-priority-${item.priority.toLowerCase()}`}>
                        {item.status === 'Resolved' ? 'Resolved' : item.priority}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="demo-conversation">
                  <div className="demo-ticket-heading">
                    <span>
                      {ticket.id}
                      <span className={`demo-ticket-status ${ticket.status === 'Resolved' ? 'is-resolved' : ''}`}>
                        {ticket.status}
                      </span>
                    </span>
                    <h3>{ticket.subject}</h3>
                    <small>
                      <Icon name="person" size={14} /> Assigned to Alex · {ticket.department}
                    </small>
                  </div>
                  {!compact && (
                    <div className="demo-view-toggle" role="group" aria-label="Conversation visibility">
                      <button type="button" aria-pressed={!customerView} onClick={() => setCustomerView(false)}>
                        Agent view
                      </button>
                      <button type="button" aria-pressed={customerView} onClick={() => setCustomerView(true)}>
                        Customer view
                      </button>
                    </div>
                  )}
                  <div className="demo-messages">
                    <div className="demo-message">
                      <span className="demo-message-avatar">{ticket.initials}</span>
                      <div>
                        <strong>
                          {ticket.name}
                          <small>Customer</small>
                        </strong>
                        <p>{ticket.body}</p>
                      </div>
                    </div>
                    {ticket.messages
                      .filter((message) => !customerView || !message.internal)
                      .map((message, index) => (
                        <div
                          key={`${ticket.id}-${index}`}
                          className={`demo-message demo-message-agent${message.internal ? ' demo-message-note' : ''}`}
                        >
                          <span className="demo-message-avatar">{message.author === 'You' ? 'YO' : 'AM'}</span>
                          <div>
                            <strong>
                              {message.author}
                              <small>{message.internal ? 'Private note · team only' : 'Support agent'}</small>
                            </strong>
                            <p>{message.body}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                  {compact ? (
                    <div className="demo-preview-composer">
                      <Icon name="reply" size={16} />
                      Reply to {ticket.name.split(' ')[0]}…
                      <span>
                        <Icon name="send" size={16} />
                      </span>
                    </div>
                  ) : !customerView ? (
                    <div className="demo-composer">
                      <div className="demo-compose-tabs" role="group" aria-label="Message type">
                        <button type="button" aria-pressed={!isNote} onClick={() => setIsNote(false)}>
                          <Icon name="reply" size={15} />
                          Reply
                        </button>
                        <button type="button" aria-pressed={isNote} onClick={() => setIsNote(true)}>
                          <Icon name="lock" size={14} />
                          Private note
                        </button>
                      </div>
                      <label className="sr-only" htmlFor="demo-reply">
                        {isNote ? 'Write a private note' : 'Write a reply'}
                      </label>
                      <textarea
                        id="demo-reply"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={
                          isNote
                            ? 'Leave some context for your team…'
                            : `Write a reply to ${ticket.name.split(' ')[0]}…`
                        }
                        maxLength={2000}
                        rows={3}
                      />
                      <div className="demo-compose-actions">
                        <button type="button" className="demo-resolve" onClick={toggleStatus}>
                          <Icon name={ticket.status === 'Open' ? 'check_circle' : 'refresh'} size={16} />
                          {ticket.status === 'Open' ? 'Resolve ticket' : 'Reopen ticket'}
                        </button>
                        <button
                          type="button"
                          className="marketing-button marketing-button-small"
                          disabled={!draft.trim()}
                          onClick={sendMessage}
                        >
                          {isNote ? 'Add private note' : 'Send reply'}
                          <Icon name="send" size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="demo-customer-hint">
                      <Icon name="lock" size={15} />
                      Customers see public replies. Private notes stay with your team.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
          {view === 'routing' && (
            <div className="demo-routing">
              <p>
                Sample rules show how requests can reach the right team. Toggle a rule to explore the configuration.
              </p>
              {rules.map((rule, index) => (
                <div key={rule.name} className="demo-rule">
                  <span className="demo-rule-icon">
                    <Icon name={rule.icon} size={23} />
                  </span>
                  <div>
                    <h3>{rule.name}</h3>
                    <p>
                      <span>IF</span> {rule.condition}
                      <br />
                      <span>THEN</span> {rule.action}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.active}
                    aria-label={rule.name}
                    onClick={() => {
                      setRules((items) =>
                        items.map((item, i) => (i === index ? { ...item, active: !item.active } : item)),
                      )
                      setAnnouncement(`Sample rule ${rule.active ? 'disabled' : 'enabled'}.`)
                    }}
                    className="demo-switch"
                  >
                    <span />
                  </button>
                </div>
              ))}
              <div className="demo-routing-note">
                <Icon name="info" size={18} />
                These sample switches do not route real tickets.
              </div>
            </div>
          )}
          {view === 'reports' && (
            <div className="demo-reports">
              <p>
                These counts reflect the three sample tickets in this tour. Resolve a ticket in the inbox to see them
                change.
              </p>
              <div className="demo-report-tiles">
                {[
                  { label: 'Sample tickets', value: tickets.length, icon: 'confirmation_number' },
                  { label: 'Open', value: tickets.length - resolvedCount, icon: 'inbox' },
                  { label: 'Resolved', value: resolvedCount, icon: 'check_circle' },
                ].map((item) => (
                  <div key={item.label}>
                    <Icon name={item.icon} size={21} />
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="demo-report-chart">
                <h3>Tickets by department</h3>
                {['Billing', 'Technical support', 'Customer success'].map((department) => (
                  <div key={department}>
                    <span>{department}</span>
                    <div className="demo-bar-track">
                      <i />
                    </div>
                    <b>1</b>
                  </div>
                ))}
              </div>
              <div className="demo-routing-note">
                <Icon name="monitoring" size={18} />
                Your real workspace also reports on SLA compliance and agent performance.
              </div>
            </div>
          )}
          {!compact && (
            <div className="demo-announcement" role="status" aria-live="polite">
              {announcement || 'Interactive sample workspace. Changes stay in this demo and reset when you leave.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
