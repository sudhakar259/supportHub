# SupportHub public website

The React application provides a public SaaS website alongside the authenticated
help desk. Visitors can understand the implemented features, explore a sample
workspace, compare current plans and create an organization.

## Visitor routes

| Route | Purpose |
| --- | --- |
| `/` | Product overview, workflow, feature highlights, FAQs and signup links |
| `/features` | Ticketing, inbound email, routing, SLAs, team collaboration, reports, APIs and workspace controls |
| `/solutions` | Example workflows for customer support, IT and software teams |
| `/demo` | Interactive sample inbox, replies, private notes, resolution, routing and reports |
| `/pricing` | Current membership plans and usage comparison from the API |
| `/register` | Organization registration, including plan selection from pricing |
| `/login` | Workspace finder (or existing sign-in when workspace domains are disabled) |
| `/contact`, `/terms`, `/privacy`, `/cookies` | Contact information and service policies |

Signed-in users can still browse the public website. The header links to their
tenant dashboard or platform dashboard as appropriate. Existing application
routes retain their authentication and permission guards.

## Product tour

`DemoWorkspace` uses explicitly labeled, fictional sample tickets held in React
state. Replies, notes, rule toggles and status changes never call the API, send
email or modify real customer data. Switching to the customer view hides private
notes. Resolving a sample ticket changes the report counts. Reset restores the
initial data; leaving the page also discards changes.

The home page uses a compact version of the same workspace illustration. The
full tour at `/demo` includes the reply composer and visibility controls.

## Pricing and signup

Pricing comes from `GET /api/v1/membership-plans`; prices are not duplicated in
marketing content. Starter is presented as Free and Enterprise as Custom. Paid
cards show their actual currency and billing interval. A billing-interval toggle
appears only when the API supplies multiple paid intervals. The comparison table
uses the same plans as the cards. Loading, unavailable and empty catalogs have
explicit states; unavailable or empty catalogs provide retry actions.

Plan links carry `?plan=<slug>` into registration. Signup continues to use
`POST /api/v1/tenants/register`. With workspace domains enabled, signup opens
email verification at the new tenant's own subdomain using a short-lived session
handoff. Workspace IDs are checked with the existing lookup endpoint. Old
lookup results are ignored after an ID changes, and a failed lookup does not
claim the ID is available. The API remains the authority on availability at
registration time.

See [workspace domains](workspace-domains.md) for per-tenant addresses, local
preview, authentication isolation, wildcard DNS and HTTPS configuration.

## Local configuration

Use Node 20.19+ for the existing Vite toolchain. From `web/`:

```bash
npm ci
cp .env.example .env
npm run dev
```

Set the existing public environment variables for the deployment:

- `VITE_API_URL`: Laravel API base URL, including `/api/v1`.
- `VITE_SUPPORT_EMAIL`: published contact email address.
- `VITE_LEGAL_ENTITY`: the business operating SupportHub.

Vite reads these at build time. Rebuild after changing production values. The
contact page displays the configured email; it has no lead-submission backend.

Public styles live in `web/src/features/landing/marketing.css` and are scoped to
`.public-site`. They preserve the existing application styling outside the
public layout. Secondary pages load on demand. Public page titles and meta
descriptions update on navigation; anchored feature links scroll below the
sticky header.

## Checks and deployment

```bash
cd web
npm test
npm run build
```

Serve `web/dist` using the existing frontend hosting setup. Configure history
fallback to `index.html` for public routes and authenticated application routes,
so direct visits such as `/features` and `/demo` work. Deploy the Laravel API,
queue worker and scheduler using [deployment.md](deployment.md); inbound email
and payments use the existing service configuration.

This implementation changes the local application source. It does not register
or publish a separate hosted Sites project.
