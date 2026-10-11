import { SITE } from '@/config/site'
import { LegalDocument } from '@/features/legal/LegalDocument'

/*
 * Starting-point terms that describe how this product actually works. Have a
 * lawyer review and adapt them (governing law, liability caps, your company
 * details) before relying on them.
 */
export function TermsPage() {
  const who = SITE.legalEntity
  return (
    <LegalDocument
      title="Terms of Service"
      intro={`These terms govern your use of ${SITE.name}, operated by ${who} (“we”, “us”). By creating a workspace or using the service you agree to them.`}
      sections={[
        {
          heading: 'The service',
          body: (
            <p>
              {SITE.name} is a hosted help desk. Each organization gets its own workspace to manage support tickets, customers, team members
              and integrations. We may improve, change or remove features over time and will try to give notice of changes that significantly
              affect you.
            </p>
          ),
        },
        {
          heading: 'Accounts and workspaces',
          body: (
            <>
              <p>
                The person who creates a workspace becomes its administrator and is responsible for it. You must give accurate information,
                keep your credentials and API secrets confidential, and tell us promptly if you suspect unauthorized use.
              </p>
              <p>
                Administrators decide who in their organization has access and what each person can do. Administrators can also sign in as
                other users of their workspace to investigate problems; this is recorded in the audit log.
              </p>
            </>
          ),
        },
        {
          heading: 'Your data',
          body: (
            <>
              <p>
                You keep all rights to the tickets, messages, attachments, customer records and other content you put into the service (“Your
                Data”). You give us permission to store, process and display it only as needed to provide the service to you.
              </p>
              <p>
                You are responsible for having the right to collect and use the personal data of your customers, and for telling them how it
                is used. For that data, you decide why and how it is processed and we process it on your behalf.
              </p>
            </>
          ),
        },
        {
          heading: 'Acceptable use',
          body: (
            <>
              <p>You agree not to:</p>
              <ul>
                <li>break the law, or upload content you have no right to share;</li>
                <li>upload malware or attempt to disrupt, probe or bypass the security of the service;</li>
                <li>access another organization’s workspace or data;</li>
                <li>exceed or circumvent plan limits and rate limits, or resell the service without our written permission;</li>
                <li>use the service to send spam or abusive messages.</li>
              </ul>
              <p>We may suspend a workspace that breaks these rules or threatens the service or other users.</p>
            </>
          ),
        },
        {
          heading: 'Plans, trials and payment',
          body: (
            <>
              <p>
                Plans and their limits are described on the pricing page. The Starter plan is free. Paid plans begin with a 14-day trial; when
                a trial or a billing period ends, access is paused until you choose a plan or pay the outstanding invoice. Your data is kept
                while access is paused.
              </p>
              <p>
                Paid plans are billed in advance each month. Payments are handled by a third-party payment provider; we do not store your full
                card details. Fees are non-refundable except where the law requires otherwise. We may change prices with advance notice
                before your next billing period.
              </p>
              <p>Plan limits (such as team members, customers, tickets per month and API requests) apply to your workspace. When a limit is reached, creating more of that item is blocked until you upgrade or free up capacity.</p>
            </>
          ),
        },
        {
          heading: 'Attachments',
          body: <p>Attachments are limited to images (JPG, PNG, WebP), text, PDF, Word (DOCX) and PowerPoint (PPT, PPTX) files of up to 2 MB each. You are responsible for what you and your customers upload.</p>,
        },
        {
          heading: 'Availability and support',
          body: <p>We work to keep the service available but do not guarantee uninterrupted or error-free operation. We may carry out maintenance, which we will try to schedule to limit disruption.</p>,
        },
        {
          heading: 'Ending your use',
          body: (
            <>
              <p>You can stop using the service at any time. We may suspend or end your access if you materially breach these terms or do not pay what you owe.</p>
              <p>After a workspace ends we delete or anonymize Your Data within a reasonable period, except where we must keep it by law. Contact us if you need a copy of your data beforehand.</p>
            </>
          ),
        },
        {
          heading: 'Disclaimers and liability',
          body: (
            <>
              <p>The service is provided “as is” and “as available”. To the extent the law allows, we disclaim all implied warranties.</p>
              <p>To the extent the law allows, we are not liable for indirect or consequential loss, lost profits or lost data, and our total liability for any claim is limited to the fees you paid for the service in the 12 months before the claim arose. Nothing in these terms limits liability that cannot be limited by law.</p>
            </>
          ),
        },
        {
          heading: 'Changes to these terms',
          body: <p>We may update these terms. If a change is material we will tell workspace administrators in advance. Continuing to use the service after a change takes effect means you accept it.</p>,
        },
        {
          heading: 'Governing law and contact',
          body: (
            <>
              <p>These terms are governed by the laws of the jurisdiction in which {who} is established, and disputes are subject to the courts there, unless mandatory consumer law says otherwise.</p>
              <p>
                {SITE.supportEmail ? (
                  <>
                    Questions about these terms: <a className="text-primary underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
                  </>
                ) : (
                  'Questions about these terms can be sent through the contact page.'
                )}
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
