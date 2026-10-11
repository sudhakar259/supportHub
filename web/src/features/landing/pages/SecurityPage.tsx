import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { WorkflowIllustration } from '@/features/landing/components/WorkflowIllustration'
import { marketingTone } from '@/features/landing/palette'

const CONTROLS = [
  { icon: 'domain', title: 'Organization-scoped workspaces', body: 'Keep tickets, customers, settings and integrations tied to their organization.', details: ['Workspace-specific addresses', 'Authenticated organization access checks'] },
  { icon: 'admin_panel_settings', title: 'Roles and department access', body: 'Give each person access to the work they are responsible for.', details: ['Administrator-managed permissions and department access', 'Customers see their own tickets and public replies'] },
  { icon: 'phonelink_lock', title: 'Two-step verification', body: 'Add authenticator-app verification to protect your sign-in.', details: ['Recovery codes and administrator recovery actions', 'Failed-attempt controls and account lockout'] },
  { icon: 'key', title: 'Controlled integrations', body: 'Limit API operations and control how your systems connect.', details: ['Scoped credentials, secret rotation and signed webhooks', 'Delivery history and authorized attachment access'] },
  { icon: 'history', title: 'Activity and audit records', body: 'Give authorized staff a record of important workspace changes.', details: ['Ticket workflow and assignment history', 'Audit logs including administrator impersonation activity'] },
  { icon: 'manage_accounts', title: 'Customer data tools', body: 'Authorized administrators can export or erase customer data.', details: ['Administrator-controlled customer data actions', 'Backups and external copies follow operator policies'] },
]

export function SecurityPage() {
  return (
    <PublicLayout>
      <section className="marketing-page-hero">
        <div className="marketing-container marketing-visual-hero-grid">
          <div className="marketing-page-hero-copy">
            <span className="marketing-eyebrow">WORKSPACE SECURITY & ACCESS</span>
            <h1>Helpdesk security.<br /><span>Accountable support.</span></h1>
            <p>Understand the access controls, account protection and customer data tools available in DeskNu.</p>
            <a href="#workspace-controls" className="marketing-button">Explore the controls <Icon name="arrow_downward" size={18} /></a>
          </div>
          <WorkflowIllustration topic="security" />
        </div>
      </section>
      <section id="workspace-controls" className="marketing-section">
        <div className="marketing-container marketing-feature-detail-grid">
          {CONTROLS.map((control) => (
            <article className={`marketing-feature-detail marketing-tone-${marketingTone(control.icon)}`} key={control.title}>
              <div className="marketing-feature-detail-top"><span className="marketing-feature-icon"><Icon name={control.icon} size={27} /></span></div>
              <h2>{control.title}</h2>
              <p>{control.body}</p>
              <ul>{control.details.map((detail) => <li key={detail}><Icon name="check_circle" size={18} />{detail}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>
      <section className="marketing-section marketing-workflow-section">
        <div className="marketing-container marketing-split">
          <div>
            <h2>Controls are part of the setup.</h2>
            <p>HTTPS, sending-domain verification, backups, monitoring and service policies require production configuration. Enable two-step verification and review permissions as your team grows.</p>
          </div>
          <div>
            <p>Read the service policies for details about operating the service and handling personal data.</p>
            <div className="marketing-actions">
              <Link to="/privacy" className="marketing-text-link">Privacy Policy</Link>
              <Link to="/terms" className="marketing-text-link">Terms of Service</Link>
              <Link to="/contact" className="marketing-text-link">Contact us</Link>
            </div>
          </div>
        </div>
      </section>
      <PublicCta />
    </PublicLayout>
  )
}
