# Architecture

SupportHub's backend is a standalone Laravel 13 REST API (`api/`). It has no
Blade frontend and no session-based web UI — every endpoint lives under
`/api/v1` and returns JSON. The `web/` directory is reserved for a future
React application that will be built as a separate phase, against the API
documented here.

```
React Web  ─┐
Mobile App ─┼─▶  REST API (/api/v1)  ─▶  Laravel  ─▶  MySQL / Redis / Storage
3rd party  ─┘
```

## Request lifecycle

Controllers are intentionally thin:

```
Route  →  Form Request (validation + per-field authorization)
       →  Controller (orchestration only)
       →  Action / Service (business logic)
       →  Eloquent Model
       →  Database
```

- **Form Requests** (`app/Http/Requests/**`) hold all validation rules. Several
  also call `$this->user()->can(...)` in `authorize()` so a request never
  reaches the controller if the actor lacks permission — this backs the
  `@bodyParam`-documented validation in the Scribe docs.
- **Actions** (`app/Actions/**`) hold business logic that's more than a
  one-line model call: ticket creation, routing, assignment, SLA
  calculation, status transitions, notifications. Each is a single-purpose,
  constructor-injected class with one public `execute()` method, which makes
  them trivial to unit test and to call from both controllers and seeders
  (see `DemoTicketSeeder`, which calls `CreateTicketAction` directly).
- **Services** (`app/Services/**`) hold reusable, stateless logic that isn't
  tied to a single domain action: `TicketStatusWorkflow` (the transition
  graph), `BusinessHoursCalculator`, `TemplateRenderingService`,
  `AuditLogger`, `TicketActivityLogger`.
- Controllers call exactly one Action/Service per unit of work, wrap the
  result in an API Resource, and return it through the `ApiResponse` trait
  (`app/Http/Concerns/ApiResponse.php`) so every response — success or
  error — has the same envelope shape (see `docs/api.md`).

## Authentication & authorization

Stateless Bearer tokens via Laravel Sanctum on a custom `api` guard — see
`docs/authentication.md` for why `auth:api` is used instead of the more
commonly-documented `auth:sanctum`, and `docs/authorization.md` for the full
RBAC model (roles, permissions, and how ticket-level access is scoped by
department).

## The ticket engine

This is the core of the system; see `docs/ticket-workflow.md` for the full
picture. Ticket **creation** runs a synchronous pipeline
(`CreateTicketAction`): routing rules evaluate and can set department,
priority, or escalate the ticket; if a department is resolved, an agent is
auto-assigned by workload; an SLA is calculated. All of this happens before
the API response is sent, so a client never has to poll to find out where a
ticket landed. Only the *notification* step is deferred to a queue
(`TicketCreated` event, dispatched after the DB transaction commits).

Ticket **status transitions** (`UpdateTicketStatusAction` +
`TicketStatusWorkflow`) are validated against a fixed graph keyed by status
slug, not id, so the seeded statuses can be renamed/recolored via the API
without touching the workflow logic.

## Primary keys: ULID vs bigint

Tables whose rows are referenced in URLs that a customer (not just staff)
can reach — `tickets`, `ticket_messages`, `ticket_attachments`,
`ticket_activities` — use a ULID primary key (`HasUlids`) instead of an
auto-incrementing integer. This keeps `/api/v1/tickets/{id}` from leaking
how many tickets exist or letting someone enumerate them by walking
integers. Reference/admin data (departments, categories, statuses,
priorities, roles) uses ordinary bigint keys — there's no enumeration
concern there, and bigint keeps joins and indexes smaller.

The **ticket number** (`TKT-2026-000125`) is a completely separate,
human-facing identifier from the ULID id — see `docs/ticket-workflow.md` for
how it's generated.

## Database design notes (deviations from a literal table-by-table spec)

A few deliberate simplifications, made because implementing them literally
would have meant two tables doing the same job:

- **No separate `ticket_category_children` table.** A subcategory is just a
  `ticket_categories` row with `parent_id` set (the standard adjacency-list
  pattern). A second table would duplicate every column just to represent
  one extra level of nesting.
- **No separate `role_user` / `permission_role` tables.** RBAC is
  implemented with `spatie/laravel-permission`, whose own pivot tables
  (`model_has_roles`, `model_has_permissions`, `role_has_permissions`) are
  polymorphic and battle-tested — reimplementing the same thing by hand
  would add risk for no benefit. See `docs/authorization.md`.
- **`business_hours` and `ticket_slas` were added** beyond the spec's literal
  table list, because "business hours" is referenced by both SLA policies
  and routing-rule conditions (needs one shared definition, not two), and
  per-ticket SLA tracking (`started_at`, due dates, breach flags) needs
  somewhere to live that isn't the `tickets` table itself.
- **Laravel's own `notifications` table was deliberately not added.**
  `notification_logs` (already in the spec's table list) serves as both the
  delivery audit trail and the record a future "my notifications" endpoint
  would query — adding Laravel's standalone polymorphic `notifications`
  table alongside it would be two tables recording the same fact.

## Directory map

```
api/
├── app/
│   ├── Actions/Ticket/        Business logic (one class, one job)
│   ├── Console/Commands/      Artisan commands (incl. the concurrency-test harness)
│   ├── Enums/                 TicketMessageType, TicketAssignmentType, NotificationLogStatus
│   ├── Events/                Ticket domain events
│   ├── Exceptions/            ApiExceptionRenderer (standard error envelope), domain exceptions
│   ├── Http/
│   │   ├── Concerns/          ApiResponse trait
│   │   ├── Controllers/Api/V1 Thin controllers
│   │   ├── Requests/          Form Requests (validation + per-field authorization)
│   │   └── Resources/         API Resources (control exactly what's serialized)
│   ├── Listeners/Ticket/      Queued notification listeners
│   ├── Models/                Eloquent models
│   ├── Notifications/         TicketEventNotification
│   ├── Policies/               Authorization policies
│   └── Services/               Stateless reusable logic
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
├── routes/
│   ├── api.php                 Requires one file per domain from routes/api/
│   └── api/                    auth.php, tickets.php, departments.php, ...
└── tests/
    ├── Feature/                HTTP-level tests, one file per domain
    └── Unit/                   Pure-logic tests (BusinessHoursCalculator)
```
