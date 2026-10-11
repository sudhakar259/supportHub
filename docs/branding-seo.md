# DeskNu branding and public website

The product is **DeskNu** (pronounced “desk new”). The public copy describes the
features implemented in this checkout: ticketing, customer accounts, inbound
email, routing, SLA policies, departments and permissions, reports, APIs and
signed webhooks. DeskNu does not currently ship AI replies, live chat, a public
knowledge base or CSAT surveys; those are not advertised as available.

## What changed

- DeskNu appears in public pages, navigation, workspace and platform shells,
  onboarding, account screens, email attribution, checkout, recovery-code files,
  API documentation and developer documentation.
- The supplied `design/logo/deskNu-logo.png` is the shared brand mark. Light
  headers use dark “Desk” lettering; navy footers, sidebars and platform headers
  use white lettering. “Nu” remains orange, following the supplied light/dark
  references. `BrandMark` frames the original PNG; it does not redraw the logo.
  Login, setup, the product tour, checkout, email headers, API docs and sharing
  images use the same artwork. Browser tabs use the supplied `favicon.png`.
- Deployable copies are in `web/public/branding` and `api/public/branding`;
  root favicon files, the touch icon and 1200 × 630 social preview are in
  `web/public`. `npm run brand:sync` copies source artwork from `design/logo`
  and rebuilds SVG wrappers. The source design folder is ignored by Git, so
  deployments use the checked-in public assets. Refresh the social-card and
  touch-icon PNG exports after changing their SVGs.
- The website has seven dedicated feature pages, a resources hub, three practical
  guides and a security/access-controls page. Product cards and navigation link
  to the new content. Prices and usage limits still come from the plan API.
- Product, Solutions and Resources have dropdown navigation. Desktop disclosures
  support Tab, arrow-key opening, Escape and outside-click dismissal; mobile
  menus expand within a scrollable panel and close after a destination is chosen.
  Solutions link directly to the corresponding workflow sections.
- The homepage hero displays an original customer support team photo, with
  responsive WebP images and a JPEG fallback in `web/public/images/support-team*`.
  It uses descriptive alternative text, explicit dimensions and high loading
  priority. Decorative email and resolution icons use the standard palette.
  The photo is illustrative; it does not represent a customer or endorsement.
  See the [asset notes and generation prompt](assets/support-team.md).
- Website, workspace and notification emails use the Solar Navy Enterprise
  palette in `design/solar_navy_enterprise/DESIGN.md`: orange actions, cool
  surfaces and navy dark sections. The Laravel email theme is inlined during
  rendering; the existing `supporthub` theme identifier remains compatible.
- Each published public page has its own title, description, canonical link,
  Open Graph/Twitter metadata and appropriate Organization, WebSite, page,
  breadcrumb and guide Article structured data. There are no invented reviews,
  ratings, customers, prices, certifications or service guarantees.

## Build and local review

Use Node 20.19+ (or a supported newer Node release):

```bash
cd web
npm ci
npm run build
npm run test:seo
npm run preview
```

The build renders **21 public routes** into HTML under `web/dist`. Public copy
and links are present before JavaScript loads. React supplies the interactive
product tour and fetches current plans after loading; prices are not fetched or
frozen at build time. `app.html` is a separate empty, no-index fallback for sign-in,
registration, authenticated and unknown routes. No customer data is rendered
into marketing HTML. `sitemap.xml` contains only the public route allowlist;
`robots.txt` advertises it and `tenant-robots.txt` disallows tenant crawling.

`npm run preview` serves the appropriate public HTML on localhost and serves the
private fallback on tenant subdomains. Runtime metadata keeps local development,
a staging host, account routes and tenant workspaces no-index. A production build
is prepared for the configured public origin: keep any staging deployment behind
access control or an HTTP `X-Robots-Tag: noindex` header so its static HTML cannot
be indexed before JavaScript runs.

## Production variables and domains

Choose and register your domain before publishing. `desknu.com` is the prepared
canonical default; this code change does not register it, configure DNS or deploy.

```dotenv
# Frontend build environment
VITE_SITE_URL=https://desknu.com
VITE_API_URL=https://api.desknu.com/api/v1
VITE_WORKSPACE_DOMAIN=desknu.com
VITE_WORKSPACE_PORT=
VITE_LEGAL_ENTITY=Your registered company name
VITE_SUPPORT_EMAIL=Your working support mailbox

# API environment
APP_NAME=DeskNu
APP_URL=https://api.desknu.com
FRONTEND_URL=https://desknu.com
WORKSPACE_DOMAIN=desknu.com
WORKSPACE_SCHEME=https
WORKSPACE_PORT=
TWO_FACTOR_ISSUER=DeskNu
MAIL_FROM_NAME=DeskNu
```

`VITE_SITE_URL` must be a bare HTTPS origin. Use the same parent domain in both
workspace variables. Change frontend variables before rebuilding; refresh
Laravel's configuration cache and restart queue workers after API changes.
Configure root, wildcard tenant and API DNS/HTTPS as described in
[workspace-domains.md](workspace-domains.md).

Email logo images are served from `APP_URL`. Keep this a public HTTPS origin
and deploy `api/public/branding`
with the API; the template preserves the configured scheme when rendering mail
in a queue worker or behind a proxy.

The branding migration refreshes exact legacy platform email defaults. Run
`php artisan migrate --force` as part of deployment. Custom platform values,
tenant sender names and tenant-owned identities stay intact. Existing
users, email addresses and tenant slugs are not rewritten in the database.
Browser tokens and administrator-return sessions migrate from the old keys on
read; logout clears both names. This preserves sessions on the same origin.
A move to a different production domain requires users to sign in on that origin.
The new Artisan commands are `desknu:preflight` and
`desknu:create-platform-admin`; previous names remain supported aliases. Demo
account checks detect both DeskNu and legacy SupportHub test addresses.
Docker resource names, database names, persistent volumes, S3 buckets and SSM
paths retain existing identifiers to avoid disconnecting stored data. They can
be migrated separately with a storage/infrastructure migration plan.

## Hosting must route public pages and tenant workspaces separately

For the repository's S3/CloudFront deployment:

1. Build with the production variables above.
2. Create a CloudFront Function using the generated
   `web/dist/hosting/cloudfront-routing.js`, publish it and associate it with the
   frontend distribution's **viewer-request** event. It uses the route list and
   canonical hostname from that build. Refresh the function if either changes.
3. Use root and wildcard frontend domain bindings with valid HTTPS certificates;
   point the API domain to the API service.
4. Remove the old global 403/404 → marketing `index.html` rule. If a fallback is
   required, use `/app.html` with TTL 0. Missing assets should stay 404.
5. Run `deploy/aws/deploy-web.sh`. It uploads immutable assets before all
   public/private HTML, gives HTML `no-cache`, and invalidates changed paths.
   If `CLOUDFRONT_FUNCTION_NAME` names your existing routing function, the script
   updates and publishes its generated code. Otherwise update the function
   manually. It does not create the function or attach it to the distribution.

The function maps root/www public paths to their generated `index.html`, private
paths and tenant hosts to `/app.html`, public robots to `/robots.txt`, and tenant
robots to `/tenant-robots.txt`. Tenant `/sitemap.xml` returns 404. Asset requests
are passed through, and query parameters are retained for signup/login flows.
A host must not serve the rendered marketing homepage for a tenant's root path.
For Nginx, use separate public and wildcard server blocks as shown in
[workspace-domains.md](workspace-domains.md).

After publishing, fetch a public feature URL with JavaScript disabled, verify its
canonical and HTML content, verify a tenant root returns `app.html` with no-index,
then submit the public sitemap in Google Search Console. Crawl exclusions and
metadata complement existing authentication; they do not replace access checks.

## Still needed from the service owner

- [ ] **Domain and HTTPS:** register the chosen domain; configure root/www,
  `*.desknu.com` and `api.desknu.com`, hosting rewrites and certificates. If a
  different domain wins, update the environment variables and rebuild first.
- [ ] **Business details:** supply the legal operator/company name and working
  support/sales email. Review terms, privacy/cookie text, jurisdiction, data
  retention, subprocessors and any refund/cancellation policy for your actual
  service. The default DeskNu name is a brand fallback, not a registered entity.
- [ ] **Plan catalog:** confirm live currencies, prices, limits and trial terms in
  platform administration. Configure Razorpay live keys and verified webhook
  delivery before collecting payment.
- [ ] **Outbound/inbound email:** configure a transactional sender with SPF/DKIM
  and DMARC, Mailgun receiving DNS and signed routes, queue workers and the
  scheduler. Verify each tenant sending domain before enabling its own From address.
- [ ] **Production operations:** complete the existing production checklist:
  durable private attachment storage, backups/restore, monitoring, trusted
  proxies, CORS, expiring sessions and removal of seeded demo credentials.
- [ ] **Search ownership and measurement:** verify Google Search Console (and
  optionally Bing Webmaster Tools), submit `/sitemap.xml`, and decide whether to
  add privacy-appropriate analytics and conversion measurement. None is installed
  or connected automatically.
- [ ] **Real proof and ongoing content:** provide permission-approved customer
  testimonials, case studies and team/about details when available. The current
  homepage screenshot uses fictional tour data; replace or supplement it with
  permission-approved customer examples when appropriate. Add guides based on
  real support questions and keep them accurate.
- [ ] **Brand clearance and redirects:** confirm naming rights and social handles;
  if an older public domain exists, configure page-to-page permanent redirects,
  update sender addresses and communicate the new workspace domain to customers.

Optional future product work: a public knowledge base, customer satisfaction
surveys, an embeddable support widget/live chat, or AI assistance. These require
implementation and validation before being added to feature or pricing copy.
SEO improvements make the site readable and accurately described; ranking and
traffic still depend on publishing, useful content and real reputation.

Implementation references: [Google's JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[site names](https://developers.google.com/search/docs/appearance/site-names),
and [software app structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app).
