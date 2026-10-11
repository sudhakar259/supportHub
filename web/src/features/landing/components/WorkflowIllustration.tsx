import { useId, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { marketingTone } from '@/features/landing/palette'

type VisualKind = 'workspace' | 'email' | 'routing' | 'sla' | 'team' | 'reports' | 'api' | 'guides' | 'security' | 'pricing' | 'contact'
type VisualStep = { icon: string; label: string; topic: string }
type VisualContent = { kind: VisualKind; title: string; caption: string; steps: VisualStep[] }

const VISUALS: Record<string, VisualContent> = {
  ticketing: {
    kind: 'workspace', title: 'One request. The whole story.', caption: 'Illustrative ticket workflow',
    steps: [{ icon: 'mail', label: 'Customer request', topic: 'email-ticketing' }, { icon: 'person', label: 'Clear owner', topic: 'team-collaboration' }, { icon: 'task_alt', label: 'Resolution', topic: 'ticketing' }],
  },
  'email-ticketing': {
    kind: 'email', title: 'From mailbox to shared queue.', caption: 'Illustrative email workflow',
    steps: [{ icon: 'mail', label: 'Support email', topic: 'email-ticketing' }, { icon: 'confirmation_number', label: 'DeskZeal ticket', topic: 'ticketing' }, { icon: 'reply', label: 'Threaded reply', topic: 'team-collaboration' }],
  },
  'helpdesk-automation': {
    kind: 'routing', title: 'The right request. The right team.', caption: 'Illustrative routing workflow',
    steps: [{ icon: 'receipt_long', label: 'Billing', topic: 'ticketing' }, { icon: 'dns', label: 'Technical support', topic: 'helpdesk-automation' }],
  },
  'sla-management': {
    kind: 'sla', title: 'Two targets. One clear priority.', caption: 'Illustrative service targets',
    steps: [{ icon: 'reply', label: 'First response', topic: 'email-ticketing' }, { icon: 'task_alt', label: 'Resolution', topic: 'ticketing' }],
  },
  'team-collaboration': {
    kind: 'team', title: 'Keep context in every handoff.', caption: 'Illustrative team handoff',
    steps: [{ icon: 'person', label: 'Current owner', topic: 'ticketing' }, { icon: 'groups', label: 'Next teammate', topic: 'team-collaboration' }],
  },
  reports: {
    kind: 'reports', title: 'See the work behind the queue.', caption: 'Illustrative chart; no live metrics',
    steps: [{ icon: 'inbox', label: 'Ticket volume', topic: 'ticketing' }, { icon: 'groups', label: 'Agent performance', topic: 'team-collaboration' }, { icon: 'timer', label: 'SLA compliance', topic: 'helpdesk-automation' }],
  },
  'api-webhooks': {
    kind: 'api', title: 'Your product, connected.', caption: 'Illustrative server integration',
    steps: [{ icon: 'code', label: 'Your server', topic: 'api-webhooks' }, { icon: 'support_agent', label: 'DeskZeal API', topic: 'ticketing' }, { icon: 'webhook', label: 'Signed events', topic: 'helpdesk-automation' }],
  },
  features: {
    kind: 'workspace', title: 'Your support tools, together.', caption: 'Illustrative support workspace',
    steps: [{ icon: 'mail', label: 'Requests', topic: 'email-ticketing' }, { icon: 'groups', label: 'Your team', topic: 'team-collaboration' }, { icon: 'monitoring', label: 'Reports', topic: 'helpdesk-automation' }],
  },
  solutions: {
    kind: 'routing', title: 'A workflow for your team.', caption: 'Illustrative department workflow',
    steps: [{ icon: 'support_agent', label: 'Customer support', topic: 'ticketing' }, { icon: 'dns', label: 'IT & service', topic: 'helpdesk-automation' }],
  },
  resources: {
    kind: 'guides', title: 'Small steps. Clearer support.', caption: 'Practical DeskZeal setup guides',
    steps: [{ icon: 'mail', label: 'Connect email', topic: 'email-ticketing' }, { icon: 'timer', label: 'Set SLA targets', topic: 'ticketing' }, { icon: 'alt_route', label: 'Route tickets', topic: 'helpdesk-automation' }],
  },
  security: {
    kind: 'security', title: 'Your workspace. Your controls.', caption: 'Illustrative workspace access controls',
    steps: [{ icon: 'domain', label: 'Scoped workspaces', topic: 'reports' }, { icon: 'phonelink_lock', label: 'Two-step verification', topic: 'helpdesk-automation' }, { icon: 'admin_panel_settings', label: 'Roles & permissions', topic: 'team-collaboration' }],
  },
  pricing: {
    kind: 'pricing', title: 'Space for your next chapter.', caption: 'Choose limits that fit your team',
    steps: [{ icon: 'person', label: 'Start small', topic: 'helpdesk-automation' }, { icon: 'groups', label: 'Grow your team', topic: 'ticketing' }, { icon: 'apartment', label: 'Scale your workspace', topic: 'team-collaboration' }],
  },
  contact: {
    kind: 'contact', title: 'Let’s talk about your team.', caption: 'Plan questions · Workspace help',
    steps: [{ icon: 'mail', label: 'Plan questions', topic: 'email-ticketing' }, { icon: 'support_agent', label: 'Workspace help', topic: 'ticketing' }],
  },
}

function TopicTile({ step }: { step: VisualStep }) {
  return (
    <div className={`marketing-visual-node marketing-tone-${marketingTone(step.topic)}`}>
      <span className="marketing-feature-icon"><Icon name={step.icon} size={28} /></span>
      <span>{step.label}</span>
    </div>
  )
}

/** Concept diagrams explain shipped workflows without presenting invented product data. */
export function WorkflowIllustration({ topic }: { topic: string }) {
  const visual = VISUALS[topic] ?? VISUALS.features
  const [paused, setPaused] = useState(false)
  const captionId = useId()

  return (
    <figure className={`marketing-workflow-visual marketing-tone-${marketingTone(topic)}`} data-motion={paused ? 'paused' : 'running'} aria-labelledby={captionId}>
      <div className="marketing-visual-heading"><span className="marketing-visual-indicator" aria-hidden="true" />{visual.title}</div>
      <div className={`marketing-visual-scene marketing-visual-scene-${visual.kind}`}>
        {visual.kind === 'workspace' && <>
          <div className="marketing-visual-hub"><Icon name="support_agent" size={44} /><strong>DeskZeal</strong><span>Shared workspace</span></div>
          <div className="marketing-visual-nodes">{visual.steps.map((step) => <TopicTile key={step.label} step={step} />)}</div>
        </>}
        {(visual.kind === 'email' || visual.kind === 'api') && <>
          <div className="marketing-visual-flow">{visual.steps.map((step) => <TopicTile key={step.label} step={step} />)}</div>
          <div className="marketing-visual-note"><Icon name={visual.kind === 'email' ? 'forum' : 'key'} size={21} />{visual.kind === 'email' ? 'Replies stay with the conversation' : 'Scoped credentials. Signed webhooks.'}</div>
        </>}
        {visual.kind === 'routing' && <>
          <div className="marketing-visual-rule"><span className="marketing-feature-icon marketing-tone-primary"><Icon name="filter_alt" size={30} /></span><div><strong>Match your routing rules</strong><span>Category · Priority · Keywords</span></div></div>
          <div className="marketing-visual-branches">{visual.steps.map((step) => <TopicTile key={step.label} step={step} />)}</div>
          <div className="marketing-visual-note"><Icon name="person_check" size={21} />Assign by available team workload</div>
        </>}
        {visual.kind === 'sla' && <>
          <div className="marketing-visual-clock" aria-hidden="true"><Icon name="timer" size={64} /><span /></div>
          <div className="marketing-visual-targets">{visual.steps.map((step) => <TopicTile key={step.label} step={step} />)}</div>
          <div className="marketing-visual-note"><Icon name="calendar_month" size={21} />Your policies. Your business hours.</div>
        </>}
        {visual.kind === 'team' && <>
          <div className="marketing-visual-flow">{visual.steps.map((step) => <TopicTile key={step.label} step={step} />)}</div>
          <div className="marketing-visual-private"><Icon name="lock" size={22} /><div><strong>Private team note</strong><span>Context for staff, inside the workspace</span></div></div>
        </>}
        {visual.kind === 'reports' && <>
          <div className="marketing-visual-chart" aria-hidden="true">{[38, 62, 46, 82, 57, 94, 72].map((height, index) => <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 0.12}s` }} />)}</div>
          <div className="marketing-visual-report-labels">{visual.steps.map((step) => <span key={step.label}><Icon name={step.icon} size={18} />{step.label}</span>)}</div>
        </>}
        {visual.kind === 'guides' && <>
          <div className="marketing-visual-book" aria-hidden="true"><Icon name="menu_book" size={65} /><span>DeskZeal / Field guides</span></div>
          <div className="marketing-visual-checklist">{visual.steps.map((step, index) => <div key={step.label} className={`marketing-tone-${marketingTone(step.topic)}`}><span className="marketing-topic-icon"><Icon name={step.icon} size={21} /></span><strong>{step.label}</strong><span className="marketing-visual-step-number">0{index + 1}</span></div>)}</div>
        </>}
        {visual.kind === 'security' && <>
          <div className="marketing-visual-shield"><Icon name="shield_lock" size={70} /><span>Your workspace</span></div>
          <div className="marketing-visual-checklist">{visual.steps.map((step) => <div key={step.label} className={`marketing-tone-${marketingTone(step.topic)}`}><span className="marketing-topic-icon"><Icon name={step.icon} size={21} /></span><strong>{step.label}</strong></div>)}</div>
        </>}
        {visual.kind === 'pricing' && <div className="marketing-visual-growth">{visual.steps.map((step, index) => <div key={step.label} className={`marketing-tone-${marketingTone(step.topic)}`}><span className="marketing-visual-growth-bar" style={{ height: `${100 + index * 45}px` }}><Icon name={step.icon} size={34} /></span><strong>{step.label}</strong></div>)}</div>}
        {visual.kind === 'contact' && <>
          <div className="marketing-visual-envelope" aria-hidden="true"><Icon name="mark_email_unread" size={88} /></div>
          <div className="marketing-visual-targets">{visual.steps.map((step) => <TopicTile key={step.label} step={step} />)}</div>
        </>}
      </div>
      <figcaption id={captionId}>
        <span>{visual.caption}</span>
        <button type="button" className="marketing-visual-motion-toggle" aria-pressed={paused} aria-label={`${paused ? 'Resume' : 'Pause'} illustration animation`} onClick={() => setPaused((value) => !value)} title={paused ? 'Resume animation' : 'Pause animation'}><Icon name={paused ? 'play_arrow' : 'pause'} size={19} /></button>
      </figcaption>
    </figure>
  )
}
