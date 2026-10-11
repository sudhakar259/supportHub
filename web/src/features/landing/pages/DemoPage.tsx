import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { DemoWorkspace } from '@/features/landing/components/DemoWorkspace'
import { PublicCta } from '@/features/landing/components/PublicCta'

export function DemoPage() {
  return (
    <PublicLayout>
      <section className="marketing-page-hero marketing-demo-hero">
        <div className="marketing-container">
          <span className="marketing-eyebrow">TAKE A LOOK AROUND</span>
          <h1>
            Your next help desk.
            <br />
            <span>Try it for yourself.</span>
          </h1>
          <p>
            Pick a ticket. Send a sample reply. Leave a private note. See what changes when your team resolves a
            request.
          </p>
          <span className="marketing-demo-notice">
            <Icon name="info" size={18} />
            Sample data only. No account needed. No emails are sent.
          </span>
        </div>
      </section>
      <section className="marketing-demo-section">
        <div className="marketing-container">
          <div className="marketing-tour-hints">
            <span>
              <b>01</b>Choose a ticket
            </span>
            <span>
              <b>02</b>Reply or leave a note
            </span>
            <span>
              <b>03</b>Resolve it & check Reports
            </span>
          </div>
          <DemoWorkspace />
          <p className="marketing-demo-footnote">
            This tour illustrates existing DeskZeal features.{' '}
            <Link to={ROUTES.register}>Create your own workspace</Link> to configure your team, SLA policies and
            integrations.
          </p>
        </div>
      </section>
      <PublicCta />
    </PublicLayout>
  )
}
