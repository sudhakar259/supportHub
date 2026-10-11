# Multi-Tenancy

SupportHub is a multi-tenant SaaS platform: one deployment, one database,
many independent organizations ("tenants"), each with its own users,
customers, tickets, departments, roles, API credentials and webhooks.
Tenant A can never see, modify, or even detect the existence of Tenant B's
data — not through a careless query, not through a guessed id, not through
a fresh/cold request with no prior state.

```
Support24 Platform
      │
      ├── Platform Admin(s)        (tenant_id = NULL, manage the platform itself)
      │
      ├── Tenant: Acme Support
      │     ├── Users / Roles
      │     ├── Departments
      │     ├── Customers
      │     ├── Tickets
      │     ├── API Credentials
      │     └── Webhooks
      │
      └── Tenant: Globex Helpdesk
            ├── Users / Roles
            ├── ...
```

## Tenant ownership

Every tenant-owned table carries a `tenant_id` column, stamped automatically
on create and enforced on every query via a global Eloquent scope — see
"Tenant context" below. This covers: `users` (nullable — see Platform Admins),
`customers`, `departments`, `tickets` and every ticket-related table
(`ticket_messages`, `ticket_attachments`, `ticket_assignments`,
`ticket_activities`, `ticket_status_history`, `ticket_slas`), reference data
(`ticket_statuses`, `ticket_priorities`, `ticket_categories`, `ticket_tags`,
`business_hours`, `sla_policies`, `ticket_number_settings`,
`ticket_number_sequences`, `ticket_routing_rules`), `roles` (via spatie's
teams feature — see below), `api_credentials`, `webhooks` and
`webhook_deliveries`.

Two tables are **platform-level**, with no `tenant_id` at all: `tenants`
itself and `membership_plans`. A handful of tables are **permanently
nullable** — `tenant_id = NULL` is a real, intentional state, not a gap:

- `notification_templates` and `system_settings` use a platform-default +
  tenant-override pattern (`HasTenantOverride`/`TenantOverlayScope`): a
  tenant sees the platform default for any key it hasn't customized, and
  its first edit forks its own row rather than mutating the shared default
  (see "Platform defaults vs. tenant overrides" below).
- `audit_logs` and `notification_logs` can record a platform-level action
  (e.g. a platform admin suspending a tenant) that has no single tenant to
  attribute to.
- `users.tenant_id` is NULL for exactly one population: Platform Admins.

## Tenant context — the core mechanism

`App\Support\TenantContext` (a per-request singleton) is the single source
of truth for "which tenant is this request operating as." It is **never**
inferred from request input — not a body field, not a query string, not a
route parameter — only from:

- **`ResolveTenantContext` middleware** (`tenant.context` alias), from the
  authenticated Sanctum user's own `tenant_id`, for every ordinary
  tenant-workspace route.
- **`ResolveIntegrationTenantContext` middleware** (`integration.auth`
  alias), from the authenticated API credential's `tenant_id`, for every
  `/integration/*` route.
- **`RequirePlatformAdmin` middleware** (`platform.admin` alias), which
  explicitly *clears* context (platform routes operate on platform-level
  tables, not a tenant's).
- Explicitly, in seeders/console commands, via `TenantContext::runAs($tenant,
  fn () => ...)`.

Once set, every tenant-owned model's `TenantScope` global scope
transparently adds `WHERE tenant_id = {current}` to every query against it
— a controller or service never writes that clause itself, which is exactly
the point: it cannot forget to. When no context is active (console,
platform routes), the scope is a deliberate no-op — code that must always
be unscoped does not need to fight the framework to get there.

**Client-provided `tenant_id` is always ignored.** A tenant user's request
body, query string, or headers can say anything; only the authenticated
identity (or API credential) determines tenant context.

### The one bug this caught, and the fix that matters most

Laravel's `SubstituteBindings` middleware — the thing that actually runs
the database query behind every `{department}`, `{ticket}`, `{customer}`,
... route parameter — is part of the default `api` middleware *group*,
which runs **before** any route-level middleware unless given explicit
priority. `ResolveTenantContext`/`ResolveIntegrationTenantContext` are not
in Laravel's default middleware-priority list (only `Authenticate` is), so
without intervention, route-model binding resolved the parameter **before**
tenant context was ever set. On a genuinely cold request (no ambient state
left over from something else), `TenantScope` was then a no-op, and the
binding was completely unscoped — any authenticated tenant user, or any
valid API credential, could fetch **any other tenant's row by id**, simply
by requesting `/departments/{id}` (or any tenant-scoped resource) with an id
that belonged to a different tenant.

This is fixed in `bootstrap/app.php` via
`$middleware->prependToPriorityList(before: SubstituteBindings::class,
prepend: ResolveTenantContext::class)` (and the same for
`ResolveIntegrationTenantContext`, `RequirePlatformAdmin`), forcing these to
run first regardless of where they're attached. It is covered by a
dedicated regression suite,
`tests/Feature/TenantIsolation/ColdRequestIsolationTest.php`, which
deliberately clears ambient context before firing a request — every other
isolation test in the suite uses `actingAsAdministrator()`/`testTenant()`,
which, as a side effect, pre-establishes context that happens to match what
the middleware would set anyway, and so could never have caught this.

## Platform Admin vs. Tenant Administrator

Two entirely separate populations, never overlapping:

| | Platform Admin | Tenant Administrator |
|---|---|---|
| `tenant_id` | `NULL` | a real tenant's id |
| Manages | All tenants, membership plans, platform-wide activity | Only their own tenant: users, roles, departments, customers, tickets, API credentials, webhooks |
| Role | `Platform Admin` (tenant_id = NULL on the role itself) | `Administrator` (one role row per tenant) |
| Gated by | `platform.admin` middleware — checks `tenant_id === null && hasRole('Platform Admin')` | ordinary permission checks, scoped to their own tenant by `TenantScope` |

A Tenant Administrator holds `'*'` (every permission) **within their own
tenant only** — there is no path by which holding that role grants any
platform-level capability. See `routes/api/platform.php` for the full
platform surface: tenant list/show/update/suspend/activate, membership plan
CRUD, and a dashboard summary.

## Roles & permissions across tenants (spatie teams)

Permissions (`tickets.view`, `customers.create`, ...) are global rows — the
`permissions` table has no `tenant_id`. What's tenant-scoped is **roles**:
`config/permission.php` has `'teams' => true` with `team_foreign_key =
'tenant_id'`, so `spatie/laravel-permission`'s own team-scoping keeps each
tenant's `Administrator`/`Agent`/`Customer`/... as a **separate role row**
with its own permission assignments, even though every tenant's role has
the same name. `TenantProvisioningService` creates this full role set (plus
default ticket statuses/priorities/numbering) for every new tenant, whether
created via `/tenants/register` or by a platform admin.

One important subtlety: spatie's own `Role` model (from the package) has
**no tenant-scoping on plain queries** — team-scoping only applies inside
the package's own helper methods (`findByName()`, the `roles()` relation),
never to `Role::all()` or implicit route-model binding. This app defines
`App\Models\Role extends Spatie\Permission\Models\Role` with the same
`BelongsToTenant` trait every other tenant-owned model uses, and points
`config('permission.models.role')` at it — every plain query, and every
`Gate`/route-binding usage, goes through the same `TenantScope` as
everything else. Before this, `GET /roles`, `GET /roles/{id}`, and even
`PUT`/`DELETE /roles/{id}` leaked and allowed modifying any other tenant's
custom roles.

Permission groups (`resource.action`): `tickets`, `users`, `customers`,
`departments`, `categories`, `priorities`, `statuses`, `routing`, `sla`,
`notifications`, `reports`, `audit-logs`, `roles`, `settings`,
`api-credentials`, `webhooks`, `billing` — see `docs/authorization.md` for
the full action list per resource.

## Platform defaults vs. tenant overrides

`NotificationTemplate` and `SystemSetting` use `HasTenantOverride` +
`TenantOverlayScope` instead of the strict `TenantScope`: a tenant sees the
platform default (`tenant_id = NULL`) for any key it hasn't customized,
plus its own override once it has one. Reading is automatic (the overlay
scope does `WHERE tenant_id = {current} OR tenant_id IS NULL`); **writing**
is copy-on-write, handled explicitly in the controller:

- `SystemSettingController::update()` includes `tenant_id` in the
  `updateOrCreate()` match array, so a first edit misses the shared default
  row and inserts this tenant's own instead of mutating it.
- `NotificationTemplateController::update()` checks whether the resolved
  template's `tenant_id` already matches the caller's tenant; if not (it's
  still the shared default), it forks a new row rather than updating in
  place.

Both tables' `key` column had to move from a **global** unique constraint
to a composite `(tenant_id, key)` one (migration `...000012`) — the
original global constraint meant the copy-on-write insert could never
actually succeed; it collided with the platform default's own row on every
attempt. This went unnoticed for a while because the pre-fix controller
code never attempted an insert at all (it only ever updated the row it
found), so the bug was latent until the copy-on-write behavior was added.

## Tenant registration

`POST /tenants/register` is the self-service "sign up a whole new
organization" flow — distinct from `POST /auth/register`, which adds a
*Customer* to an **existing** tenant's helpdesk. Registration creates the
tenant, provisions its roles/ticket statuses/priorities/numbering
(`TenantProvisioningService`), creates a `Subscription` to the chosen (or
default Starter) `MembershipPlan`, and creates the owner account with the
tenant's `Administrator` role — all in one transaction. A free plan
activates immediately; a paid plan starts a 14-day trial (billing
integration itself is out of scope). `GET /tenants/lookup/{slug}` lets a
client confirm a slug exists and is active before prompting for
credentials.

## Logging in / registering within an existing tenant

Because email is unique **per tenant**, not globally, the same address can
be a different account in a different tenant. `POST /auth/register`
requires a `tenant` slug. `POST /auth/login`,
`POST /auth/forgot-password`, and `POST /auth/reset-password` all accept an
*optional* `tenant` slug to disambiguate — omitted, login tries every
account with that email against the given password (unambiguous unless two
accounts happen to share the exact same password too); omitted on
forgot/reset-password, the first matching account wins, which is why
specifying it is the safer choice whenever the same email might exist in
more than one tenant. See `docs/authentication.md`.

## Integration API: API credentials, scopes, and customer identity

A tenant's own backend, CRM, or chat widget authenticates to
`/api/v1/integration/*` with an API key + secret pair — never a Sanctum
session. See `ResolveIntegrationTenantContext`
(`app/Http/Middleware/ResolveIntegrationTenantContext.php`):

1. `X-Api-Key` / `X-Api-Secret` headers identify and authenticate the
   credential (the secret is bcrypt-hashed at rest via `ApiCredential`'s
   `secret_hash`column — never recoverable, only verifiable).
2. The credential's own `tenant_id` becomes the request's `TenantContext`
   — exactly as unforgeable as a Sanctum user's `tenant_id`.
3. Revoked credentials, and credentials belonging to a suspended tenant,
   are rejected before any route logic runs.
4. Each credential carries a `scopes` array (`customers.read`,
   `customers.create`, `customers.update`, `tickets.read`,
   `tickets.create`, `tickets.update`, `tickets.reply`,
   `tickets.status.update`, `tickets.reopen`, `tickets.attachments`); `RequireApiScope`
   (`scope:X` route middleware) rejects any request whose credential
   lacks the scope the endpoint requires.

Tenant administrators manage their own credentials via
`/api/v1/api-credentials` (Sanctum-authenticated, `api-credentials.*`
permissions): create (returns the plain secret exactly once), list, view,
update name/scopes, rotate the secret (issues a new one, old one stops
working immediately), revoke (permanent).

**Customer identity** for the integration API is resolved by whichever
identifier the caller's own system already has on hand — `customer_id` (if
already known from a prior integration call), `customer_email`, or
`customer_external_id` (`customers.external_id`, this tenant's own foreign
key into *its* system, e.g. `wp-user-7842`) — never by a global search.
`GET /integration/customers/lookup?email=...` or `?external_id=...` finds a
customer the same way. Every one of these lookups is implicitly scoped to
the credential's own tenant by the same `TenantScope` as everything else;
there is no code path that searches across tenants.

Ticket replies and attachment uploads posted through the integration API
are attributed to the ticket's own customer (there is no staff Sanctum
session backing an API credential, so there's no agent identity to
attribute them to) — use the regular Sanctum-authenticated ticket endpoints
for agent-side replies.

## Webhooks

Tenant-configured HTTP callbacks for ticket lifecycle events, managed via
`/api/v1/webhooks` (`webhooks.manage` permission): `ticket.created`,
`ticket.assigned`, `ticket.status_changed`, `ticket.resolved`,
`ticket.closed`, `ticket.reopened`, and `ticket.replied` (fired for both
agent and customer replies). `ticket.updated` is reserved in
`Webhook::EVENTS` for a future general-attributes-changed event; nothing
currently fires it.

- **Delivery**: each subscribed, active webhook gets a queued
  `DeliverWebhookJob` per event (dispatched from `WebhookDispatcher`, called
  from one listener per ticket event under `app/Listeners/Webhook/`). The
  job POSTs a signed JSON body and logs a `WebhookDelivery` row — one per
  attempt, success or failure — so the full retry history is visible, not
  just the final outcome. A failing endpoint retries with backoff (10s,
  60s, 5m, 15m) up to 5 attempts; it never blocks or fails the original
  request that triggered the event (ticket creation, reply, ...) in a
  real deployment with a proper async queue — see the note in
  `tests/Feature/WebhookDeliveryTest.php` about why one test there exercises
  the job directly rather than through the full event chain.
- **Signing**: `X-Webhook-Signature` is an HMAC-SHA256 of the raw JSON body,
  keyed by the webhook's own secret (`Webhook::sign()`). The secret itself
  is Laravel-encrypted at rest (`'secret' => 'encrypted'` cast, reversible
  — unlike an API credential's secret, a webhook's must be re-readable to
  sign each delivery) and returned in plain text exactly once, at creation.
- **SSRF protection**: webhook URLs are tenant-supplied and POSTed to
  unsupervised, so `App\Rules\NotAPrivateUrl` rejects loopback, private,
  link-local and reserved address ranges at creation/update time —
  resolving the hostname and checking every A record, not just the literal
  string, and refusing to accept a hostname that won't resolve at all.
- **Test delivery**: `POST /webhooks/{webhook}/test` sends a synthetic
  `webhook.test` event synchronously (no queue, no retry) via
  `WebhookDispatcher::test()`, so a tenant can check its endpoint and
  signature verification without waiting for a real ticket event. Still
  recorded as an ordinary `WebhookDelivery` row.
- **Secret rotation**: `POST /webhooks/{webhook}/rotate-secret` issues a new
  secret for the same webhook (same idea as `ApiCredentialController::rotate()`)
  — the old secret stops verifying immediately, without needing to delete
  and recreate the webhook.

## Plan limits

`PlanLimitService` is the single place plan limits are read and enforced —
every resource-creating endpoint (tickets, customers, users, departments,
API credentials, webhooks; both the regular and integration-API creation
paths) calls `assertCanCreate($tenant, $feature)` before creating the row.
Usage is computed live (a `COUNT` query scoped by `TenantScope`, not a
denormalized counter that could drift). A tenant with no subscription is
treated as unlimited — registration always creates one, so this is a
data-integrity fallback, not a billing decision. Exceeding a limit returns
`403` with `{"errors": {"feature": "...", "limit": N}}`
(`PlanLimitExceededException`, rendered by `ApiExceptionRenderer`).

### API rate limiting

Separate from the above (a limit on *stored* rows, checked at write time),
the Integration API is also rate-limited per *request*, via the plan's
`api_requests_per_day` figure. `RateLimiter::for('integration', ...)` in
`AppServiceProvider` reads the calling credential's tenant's plan limit and
applies `Limit::perDay($limit)->by($credential->id)` — one rolling 24h
counter per API credential, not per tenant, so one integration hitting its
own limit doesn't throttle a sibling credential on the same tenant. A plan
with no `api_requests_per_day` value (e.g. Enterprise) is unlimited. The
regular dashboard-facing `api`/`auth` limiters are unchanged — flat,
IP/user-keyed limits meant to slow down abuse, not meter a paid plan.
Exceeding the integration limit returns `429` with
`{"errors": {"limit": N, "period": "day", "retry_after_seconds": N}}` plus
the standard `Retry-After`/`X-RateLimit-*` headers.

## Testing tenant isolation

`tests/Feature/TenantIsolation/` is the dedicated suite:

- `CrossTenantAccessTest.php` — Tenant A addressing Tenant B's department/
  customer/ticket/category/priority/status/SLA policy/routing rule/user/
  role by id, and listing endpoints, all expecting `404`/exclusion.
- `CrossTenantValidationTest.php` — request bodies that *reference* another
  resource by id (a ticket's `category_id`, an SLA policy's
  `department_id`, ...) rejecting a cross-tenant id with `422`, paired with
  "the same value is fine for two different tenants" cases (department
  codes, role names, ticket status/priority slugs, staff emails).
- `TenantOverrideWriteTest.php` — the copy-on-write behavior for
  notification templates and system settings.
- `ColdRequestIsolationTest.php` — the cold-request regression guard
  described above.
- `PasswordResetIsolationTest.php` — the `tenant` disambiguator for
  password reset when the same email exists in more than one tenant.

Plus `tests/Feature/Integration/IntegrationApiTest.php` (credential auth,
scope enforcement, cross-tenant denial for the integration API specifically)
and `tests/Feature/WebhookDeliveryTest.php`/`WebhookManagementTest.php`/
`ApiCredentialManagementTest.php`/`PlanLimitEnforcementTest.php` for the
features layered on top.

A recurring pattern worth knowing if you add to this suite: `testTenant()`
(in `tests/Pest.php`) lazily creates and **establishes as ambient context**
a shared per-test tenant, so that ordinary `Model::factory()->create()`
calls elsewhere in the test land in the right tenant without every test
needing to wrap everything in `actingAsAdministrator()`. This is
convenient, but it means any test working with a *second*, explicit tenant
must either wrap that tenant's setup in
`TenantContext::runAs($otherTenant, fn () => ...)` or accept that ambient
context reverts to the shared tenant afterward — and, for anything checking
cold-request behavior specifically, must call `TenantContext::clear()`
before firing the request, since otherwise leftover ambient state from
earlier in the *same* test (not a real production concern — a real request
always starts from nothing) can mask what the route's own middleware would
actually do.
