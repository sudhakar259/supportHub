import { SITE } from '@/config/site'
import { LegalDocument } from '@/features/legal/LegalDocument'

/*
 * Starting-point policy that matches what the application actually stores and
 * which third parties it talks to. Review with a lawyer, and update the
 * "Service providers" list to name your real hosting, email and payment vendors.
 */
export function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      intro={`This policy explains what personal information ${SITE.name}, operated by ${SITE.legalEntity}, handles, why, and what choices you have.`}
      sections={[
        {
          heading: 'Two roles: your organization and us',
          body: (
            <>
              <p>
                <strong>If you contact a company that uses {SITE.name} for support</strong> (for example by opening a ticket), that company is
                the one who decides how your information is used. We process it on its behalf to run its help desk. Please contact that company
                about requests concerning your tickets.
              </p>
              <p>
                <strong>If you create or use a workspace</strong> (as an administrator or team member), we are responsible for the account and
                billing information described below.
              </p>
            </>
          ),
        },
        {
          heading: 'What we collect',
          body: (
            <ul>
              <li><strong>Account details:</strong> name, email address, phone number (optional), and a securely hashed password.</li>
              <li><strong>Workspace content:</strong> tickets, messages, internal notes, attachments, customer records, departments and settings entered by users and by integrations.</li>
              <li><strong>Activity records:</strong> sign-in times, an audit log of sensitive actions, and technical logs that can include IP addresses and request details used to keep the service secure.</li>
              <li><strong>Billing details:</strong> plan, invoices and payment status. Card details are entered with our payment provider, not stored by us.</li>
            </ul>
          ),
        },
        {
          heading: 'How we use it',
          body: (
            <ul>
              <li>to provide, secure and support the service, including sending ticket notifications and account emails;</li>
              <li>to bill for paid plans and prevent fraud and abuse;</li>
              <li>to investigate problems and improve reliability;</li>
              <li>to meet legal obligations.</li>
            </ul>
          ),
        },
        {
          heading: 'Who it is shared with',
          body: (
            <>
              <p>We do not sell personal information. We share it only with:</p>
              <ul>
                <li><strong>Service providers</strong> that help us run the service: cloud hosting, email delivery, payment processing (Razorpay) and the font provider described in the Cookie Policy. They may use the data only to provide their service to us.</li>
                <li><strong>The workspace you deal with:</strong> administrators of a workspace can see the accounts and content in it, and can sign in as users of that workspace (this is logged).</li>
                <li><strong>Authorities</strong> when the law requires it.</li>
              </ul>
            </>
          ),
        },
        {
          heading: 'How long we keep it',
          body: <p>We keep workspace content while the workspace is active. When a workspace ends, we delete or anonymize its data within a reasonable period, except for what we must keep for legal, tax or security reasons (such as invoices and audit records).</p>,
        },
        {
          heading: 'Security',
          body: <p>Each workspace’s data is kept separate from other workspaces, passwords and API secrets are stored hashed, access is controlled by roles and permissions, and connections are protected with encryption in transit. No system is perfectly secure, so please use a strong password and keep API secrets private.</p>,
        },
        {
          heading: 'Your rights',
          body: (
            <p>
              Depending on where you live, you may have the right to access, correct, delete or export your personal information, to object to or
              restrict certain use, and to complain to a data protection authority. To use these rights for a company’s tickets, contact that
              company; for your account with us, contact us using the details below. We will respond within the time the law requires.
            </p>
          ),
        },
        {
          heading: 'International transfers',
          body: <p>Our service providers may process data in other countries. Where required, we rely on appropriate safeguards for those transfers.</p>,
        },
        {
          heading: 'Children',
          body: <p>The service is for businesses and is not directed to children under 16. We do not knowingly collect their personal information.</p>,
        },
        {
          heading: 'Changes and contact',
          body: (
            <>
              <p>We will post updates here and change the date above; for material changes we will notify workspace administrators.</p>
              <p>
                {SITE.supportEmail ? (
                  <>
                    Privacy questions and requests: <a className="text-primary underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
                  </>
                ) : (
                  'Privacy questions and requests can be sent through the contact page.'
                )}
              </p>
            </>
          ),
        },
      ]}
    />
  )
}
