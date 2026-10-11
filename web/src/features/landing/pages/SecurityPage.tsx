import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { PublicCta } from '@/features/landing/components/PublicCta'

const CONTROLS = [
  { icon: 'domain', title: 'Organization-scoped workspaces', body: 'Tickets, customers, team members, settings and integrations belong to their organization. Workspace addresses and authenticated access checks keep requests tied to the intended tenant.' },
  { icon: 'admin_panel_settings', title: 'Roles and department access', body: 'Administrators manage permissions for ticket work, customer records, reports and settings. Department membership scopes staff access; customer accounts see their own tickets and public replies.' },
  { icon: 'phonelink_lock', title: 'Two-step verification', body: 'Users can enable authenticator-app verification and download recovery codes. Sign-in protection includes failed-attempt controls and account lockout, with administrator recovery actions.' },
  { icon: 'key', title: 'Controlled integrations', body: 'Scoped API credentials limit integration operations and support secret rotation. Signed webhooks include delivery history, and ticket attachments require authorized access.' },
  { icon: 'history', title: 'Activity and audit records', body: 'Ticket history records workflow changes. Workspace audit logs let authorized staff review important actions, including administrator impersonation activity.' },
  { icon: 'manage_accounts', title: 'Customer data tools', body: 'Authorized administrators can export or erase customer data. Backup retention and the handling of copies outside DeskNu depend on the service operator’s policies.' },
]

export function SecurityPage() {
  return (
    <PublicLayout>
      <section className="marketing-page-hero">
        <div className="marketing-container">
          <span className="marketing-eyebrow">WORKSPACE SECURITY & ACCESS</span>
          <h1>Helpdesk security.<br /><span>Accountable support.</span></h1>
          <p>Understand the access controls, account protection and customer data tools available in DeskNu.</p>
        </div>
      </section>
      <section className="marketing-section">
        <div className="marketing-container marketing-feature-detail-grid">
          {CONTROLS.map((control) => (
            <article className="marketing-feature-detail" key={control.title}>
              <span className="marketing-feature-icon"><Icon name={control.icon} size={27} /></span>
              <h2>{control.title}</h2>
              <p>{control.body}</p>
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
