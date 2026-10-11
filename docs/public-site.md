# DeskZeal public website

The React application provides a public SaaS website alongside the authenticated
help desk. Visitors can understand the implemented features, explore a sample
workspace, compare current plans and create an organization.

## Visitor routes

| Route | Purpose |
| --- | --- |
| `/` | Product overview, workflow, feature highlights, FAQs and signup links |
| `/features/:slug` | Dedicated ticketing, email, routing, SLA, collaboration, reporting and API explainers |
| `/resources`, `/resources/:slug` | Helpdesk guide hub and practical setup articles |
| `/security` | Implemented workspace security and access controls |
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

Developer integration documentation is available only inside the authenticated
tenant workspace at **Integrations → Developer Docs** (`/integrations/developer-docs`).
The guide, endpoint reference, OpenAPI export and Postman export require the
existing Bearer session and workspace context on the API. Generated files are
stored outside the public directory; the old `/docs` URLs are blocked. The
public API and webhooks feature page remains a product overview. Documentation
contents are fetched after sign-in, excluded from public bundles and the sitemap,
and returned with private, no-store caching headers.

## Product tour

`DemoWorkspace` uses explicitly labeled, fictional sample tickets held in React
state. Replies, notes, rule toggles and status changes never call the API, send
email or modify real customer data. Switching to the customer view hides private
notes. Resolving a sample ticket changes the report counts. Reset restores the
initial data; leaving the page also discards changes.

The homepage hero uses an original, illustrative customer support team photo,
with navy and orange accents that match the brand. Responsive WebP versions are
in `web/public/images/support-team-640.webp` and `support-team-1280.webp`, with
`support-team.jpg` as a fallback. The image has descriptive alternative text,
fixed dimensions and high loading priority. See the [asset notes and generation
prompt](assets/support-team.md). The hero's product tour button opens `/demo`,
which includes the reply composer and visibility controls.

The hero's eyebrow indicator pulses, background rings move gently, and email
and resolution icons float. A pause/resume button stops all hero animation.
The hero stays still when the visitor enables reduced motion on their device.

The header groups the implemented features under Product, workflow sections
under Solutions, and guides, security and contact links under Resources.
Desktop dropdowns support keyboard navigation, Escape and outside-click
dismissal. Mobile navigation uses one expanded group at a time and scrolls on
short screens without shifting links during a tap.
Menu icons use coordinated orange, teal, blue, violet and navy accents with soft
backgrounds from the standard palette. Related destinations keep the same color
family across menus; navigation active states and overview links use primary.

The feature, solution, resource, guide, security, pricing and contact pages use
lightweight HTML/CSS concept illustrations in their heroes. Email, routing,
SLA targets, handoffs, reports and API flows have distinct diagrams grounded in
the implemented product. They are labeled as illustrative; charts do not imply
live customer metrics. Each illustration includes a pause/resume control and
stays still when reduced motion is enabled. The existing homepage photo and
interactive demo remain the other visual entry points.

Feature explainers use three concise cards with expandable implementation
details. Guide pages have numbered steps and a linked setup checklist, sticky
on desktop and stacked on mobile. Short visible guide headlines retain the
full article titles in SEO metadata. Topic colors are shared across menus,
icons and tiles through `web/src/features/landing/palette.ts`, using the
existing palette tokens while primary buttons and links stay orange.

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
- `VITE_SITE_URL`: bare HTTPS public origin for canonical URLs and sitemap.
- `VITE_WORKSPACE_DOMAIN`: matching API parent domain for tenant subdomains.
- `VITE_SUPPORT_EMAIL`: published contact email address.
- `VITE_LEGAL_ENTITY`: the business operating DeskZeal.

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

Serve the generated HTML in `web/dist` for public routes, and `app.html` for
private paths and tenant hosts. The build also generates sitemap, robots policies
and a CloudFront routing function. See [branding-seo.md](branding-seo.md) for
hosting setup and the remaining launch inputs. Deploy the Laravel API,
queue worker and scheduler using [deployment.md](deployment.md); inbound email
and payments use the existing service configuration.

This implementation changes the local application source. It does not register
or publish a separate hosted Sites project.
