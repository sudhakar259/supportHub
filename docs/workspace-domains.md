# Tenant workspace domains

One DeskNu deployment serves the public website and every tenant workspace.
The tenant's existing globally unique slug is its subdomain:

| Address | Experience |
| --- | --- |
| `https://desknu.com` | Public website, product tour, pricing and signup |
| `https://desknu.com/login` | Workspace finder; enter `crevol` to continue |
| `https://crevol.desknu.com` | Crevol's authenticated dashboard or sign-in |
| `https://crevol.desknu.com/login` | Sign-in scoped automatically to Crevol |
| `https://api.desknu.com/api/v1` | Shared Laravel API |
| `https://desknu.com/login?platform=1` | Platform administrator sign-in |

Creating a tenant does not require an individual frontend deployment or DNS
record. All tenant subdomains use the same frontend build. New workspace IDs
must be lowercase DNS labels of at most 63 characters, containing letters,
numbers and internal hyphens. Names such as `www`, `api`, `admin` and `platform`
are reserved. Older IDs containing underscores must be renamed before they can
be used as subdomains; single-domain API access remains available.

## Production configuration

In the API deployment's environment:

```dotenv
APP_URL=https://api.desknu.com
FRONTEND_URL=https://desknu.com
WORKSPACE_DOMAIN=desknu.com
WORKSPACE_SCHEME=https
WORKSPACE_PORT=
CORS_ALLOWED_ORIGINS=https://desknu.com,https://www.desknu.com
```

In the frontend's build environment:

```dotenv
VITE_API_URL=https://api.desknu.com/api/v1
VITE_SITE_URL=https://desknu.com
VITE_WORKSPACE_DOMAIN=desknu.com
VITE_WORKSPACE_PORT=
```

Use your own registered parent domain consistently in both environments.
Rebuild the frontend after changing its variables and rebuild Laravel's config
cache after changing API variables. Restart queue workers so notification links
use the new configuration. All API instances must share the configured cache
store, such as Redis, for session handoff codes and locks.

On your DNS and hosting providers:

1. Point the root domain and `*.desknu.com` to the frontend's hosting entry
   point. Configure `api.desknu.com` explicitly for the API if it is separate.
2. Configure the frontend host to accept both the root and wildcard domains.
3. Provision HTTPS for the root, wildcard tenant domains and API. Wildcard
   certificates usually require DNS validation through your certificate provider.
4. Serve the generated public HTML on the root/www hosts. Use `app.html` for
   private paths and all tenant page routes, including direct visits to `/login`,
   `/dashboard` and `/tickets/123`. See [branding and SEO hosting](branding-seo.md).
5. Keep the API on its existing Laravel reverse proxy configuration. It allows
   CORS from the root's configured origins and a single valid workspace label
   under `WORKSPACE_DOMAIN`, using the configured scheme and port.

For Nginx, use separate root/www and wildcard server blocks. Start with
[`deploy/nginx/frontend.conf.example`](../deploy/nginx/frontend.conf.example),
set the actual root directory and configure HTTPS directly or through your load
balancer. For S3/CloudFront use the build-generated viewer-request function in
[branding-seo.md](branding-seo.md). Do not use the rendered marketing homepage as
the global SPA fallback on tenant domains.

DNS, certificates and hosting domain bindings are infrastructure configuration;
editing this checkout does not publish those addresses.

## Sign-in and isolation

The frontend identifies the tenant from the current hostname and sends
`X-Workspace: crevol` to the shared API, including attachment downloads. The API
can also identify the workspace directly when served on a tenant hostname. A
hostname/header mismatch, conflicting login tenant, unknown workspace, or token
belonging to a different tenant is rejected before tenant data is returned.
Integration credentials are checked against the workspace in the same way.

`TenantContext` continues to come from the authenticated user or integration
credential. The subdomain is a restriction, never an authorization source.
Existing permission, email verification, account status and subscription checks
continue to apply. Two-factor challenges cannot be completed from another
workspace. Browser sessions are stored separately for each origin.

Signup previews the workspace address and creates the existing organization,
subscription and owner account. To move the owner to the new origin, the frontend
requests a random, single-use handoff code, revokes the initial signup token and
opens the workspace with the code in a URL fragment. Fragments are not sent to
the web server. The code is removed from the address bar immediately, exchanged
only for its intended tenant, and expires after two minutes. No bearer token is
placed in a URL. Unverified owners still land on email verification before
onboarding. If handoff is unavailable, signup keeps the original verification
flow so the created account remains usable.

Password reset emails and ticket notification links point to the user's or
ticket's tenant workspace. Platform accounts retain root-domain links.
Password reset tokens are stored per tenant account, so a link issued for one
workspace cannot reset another account sharing the same email. Tenant reset
links issued before this change require a fresh password reset request.
An account password change also invalidates pending workspace handoff codes.
Handoff preserves explicit token expiry and refuses impersonation sessions;
existing impersonation stays on its current origin with its original expiry.

## Local preview

With the API's `FRONTEND_URL=http://localhost:5173` and frontend
`VITE_API_URL=http://localhost:8080/api/v1`, localhost workspace domains are
enabled automatically outside production. Run the frontend normally with
`npm run dev`; Vite binds IPv4 loopback so browsers can resolve `*.localhost`
without editing a hosts file. Use the actual port printed by Vite if different.

For the existing demo tenants:

- `http://acme-support.localhost:5173`
- `http://globex-helpdesk.localhost:5173`

Only existing tenant slugs open real workspaces. `/demo` on the root website
remains the clearly labeled fictional product tour. A new `crevol` tenant would
use `http://crevol.localhost:5173` locally and `https://crevol.desknu.com` when
deployed with the configuration above.

If workspace domains are left unset in production, the existing single-domain
application and explicit organization login continue to work.
