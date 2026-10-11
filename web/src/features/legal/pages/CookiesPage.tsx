import { SITE } from '@/config/site'
import { LegalDocument } from '@/features/legal/LegalDocument'

/** Describes exactly what the web app stores in the browser. Update it if you add analytics or marketing tools. */
export function CookiesPage() {
  return (
    <LegalDocument
      title="Cookie Policy"
      intro={`This page explains what ${SITE.name} stores in your browser and which outside services your browser contacts.`}
      sections={[
        {
          heading: 'What we store',
          body: (
            <ul>
              <li>
                <strong>Sign-in token (local storage):</strong> after you sign in, a token is kept in your browser’s local storage so you stay
                signed in. It is required for the service to work and is removed when you sign out.
              </li>
              <li>
                <strong>Impersonation marker (session storage):</strong> when an administrator signs in as another user, the administrator’s
                own session is held in that tab’s session storage so they can return to it. It is cleared when they return or close the tab.
              </li>
            </ul>
          ),
        },
        {
          heading: 'What we do not use',
          body: <p>We do not use advertising cookies, cross-site tracking or analytics tools in the application. Because we store only what is strictly necessary for the service you asked for, we do not show a cookie consent banner. If that changes, we will update this policy and ask for consent where required.</p>,
        },
        {
          heading: 'Fonts and icons from Google',
          body: <p>Our pages load fonts and icons from Google Fonts. When a page loads, your browser contacts Google’s servers, which receive your IP address and browser details as part of that request. Google’s own policies govern what it does with that information.</p>,
        },
        {
          heading: 'Your choices',
          body: <p>You can clear your browser’s stored data at any time; you will be signed out. Blocking all site storage will stop you from being able to sign in.</p>,
        },
        {
          heading: 'Contact',
          body: (
            <p>
              {SITE.supportEmail ? (
                <>
                  Questions: <a className="text-primary underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
                </>
              ) : (
                'Questions can be sent through the contact page.'
              )}
            </p>
          ),
        },
      ]}
    />
  )
}
