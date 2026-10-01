# Authorization

Two layers, always enforced server-side — the frontend's job is only to
hide controls the user can't use, never to be the actual gate.

## 1. Roles & permissions (what you're allowed to do)

Implemented with `spatie/laravel-permission` on the `api` guard, seeded by
`database/seeders/RolesAndPermissionsSeeder.php`.

**Why spatie/laravel-permission instead of hand-rolled `role_user` /
`permission_role` tables:** the package's pivot tables
(`model_has_roles`, `model_has_permissions`, `role_has_permissions`) are
polymorphic, well-tested, and already handle the caching and query
optimization that a from-scratch implementation would need to reinvent.
`config/permission.php` has `teams => false` — permissions are global, not
department-scoped; department-scoped *data* access is a separate, second
layer (below).

### Roles

| Role | Typical holder |
|---|---|
| Administrator | Full access to everything |
| Department Manager | Manages one or more departments' tickets and staff |
| Senior Agent | Experienced support staff — can assign/escalate/close |
| Agent | Front-line support — can reply and resolve, not close/escalate |
| Customer | End user raising and tracking their own tickets |

Custom roles can be created via `POST /api/v1/roles` with any subset of the
permissions below (`roles.manage`). The `Administrator` and `Customer`
roles cannot be deleted.

### Permissions

Grouped by resource, each as `resource.action`:

```
tickets:     view, view_internal_notes, create, update, assign, escalate,
             resolve, close, reopen, delete
users:       view, create, update, delete
customers:   view, create, update, delete
departments: view, create, update, delete
categories:  view, create, update, delete
priorities:  view, create, update, delete
statuses:    view, create, update, delete
routing:     view, manage
sla:         view, manage
notifications: view, manage
reports:     view
audit-logs:  view
roles:       view, manage
settings:    view, manage
```

`tickets.view_internal_notes` is deliberately its own permission, held only
by Agent/Senior Agent/Department Manager/Administrator roles — **no seeded
or default role grants it to Customer**, so a customer is structurally
incapable of holding it, not merely blocked by a conditional check that
could be forgotten in some new endpoint. See `docs/ticket-workflow.md` for
how this is enforced at the query level, not just the response level.

`roles.*` permissions are **not** auto-creatable via the API —
`PermissionController` is read-only by design, because an admin-created
permission string with no corresponding `can()`/`Gate` check anywhere in
the code would be meaningless (and a false sense of security). New
permissions are added in code, in `RolesAndPermissionsSeeder`.

### Checking permissions

```php
$user->can('tickets.resolve');          // bool
$user->hasRole('Senior Agent');          // bool
```

Every Form Request's `authorize()` method and every Policy method ultimately
reduces to one of these two calls.

## 2. Row-level scoping (which records you're allowed to touch)

Holding `tickets.view` doesn't mean every ticket is visible — `TicketPolicy`
additionally scopes by **department membership** and **direct assignment**:

- **Customers** see only tickets where `ticket.customer.user_id === $user->id`.
- **Administrators** see everything.
- **Everyone else** (Agent, Senior Agent, Department Manager) sees a ticket
  only if: they're its `assignee`, **or** they belong to its `department`
  (`department_user` pivot), **or** the ticket has no department yet
  (unrouted tickets are visible to any staff with `tickets.view`, since
  someone needs to be able to triage them).

This scoping is applied **twice** for defense in depth: once as a query
filter in `TicketController::index()` (so it never appears in a list the
user shouldn't see), and once as a Policy check in `TicketController::show()`
(so direct access by id is independently denied, not just hidden from
listings). The same two-layer pattern is used for ticket messages — see
`docs/ticket-workflow.md`.

## Policies registered

Every authorization-sensitive model has an explicit Policy, bound in
`AppServiceProvider::boot()` via `Gate::policy()` (not relying on Laravel's
naming-convention auto-discovery, so the wiring is visible in one place):

`User`, `Department`, `Customer`, `TicketCategory`, `TicketStatus`,
`TicketPriority`, `Role` (spatie's), `Ticket`, `TicketAttachment`,
`TicketRoutingRule`, `SlaPolicy`.

## Self-service vs. admin fields

A few endpoints let a user act on their own record with a *narrower* set of
fields than an admin can change on anyone's record — this is enforced in
the controller, not the Policy, because it's a field-level distinction
within a single "yes you can update this" decision:

- `PUT /users/{user}`: a user may always update their own `name`/`phone`/
  `timezone`; only a holder of `users.update` may change `is_active` or
  `email` (their own or anyone else's).
- `PUT /tickets/{ticket}`: a customer may edit their own ticket's
  `subject`/`description`/`category_id` while it's open, but not
  `priority_id` — that's a staff triage decision.
