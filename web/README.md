# DeskNu web

React, TypeScript and Vite frontend for the DeskNu Laravel API. Includes the
public SaaS website, workspace signup and onboarding, customer and staff ticket
workflows, administration, reports, integrations and billing.

## Run locally

Use Node 20.19+.

```bash
npm ci
cp .env.example .env
npm run dev
```

Set `VITE_API_URL` to the running Laravel API base URL, including `/api/v1`.
The example uses Docker's default port `8080`. Public contact and legal
information use `VITE_SUPPORT_EMAIL` and `VITE_LEGAL_ENTITY`.

Local tenant workspaces use `<tenant-slug>.localhost` on Vite's port. Production
workspace domains use `VITE_WORKSPACE_DOMAIN` and the matching API
`WORKSPACE_DOMAIN`; see [workspace domain setup](../docs/workspace-domains.md)
for wildcard DNS, HTTPS and authentication details.

## Check and build

```bash
npm test
npm run build
```

The build renders public pages into `dist/` and generates a sitemap, robots
policies and hosting rewrites. Serve `app.html` for private routes and tenant
hosts; see [branding and SEO setup](../docs/branding-seo.md). Page modules load
on demand, while existing route guards protect the authenticated application.

See [the public-site guide](../docs/public-site.md) for visitor routes, the
interactive tour, pricing, signup and hosting configuration, and
[deployment instructions](../docs/deployment.md) for the backend.
