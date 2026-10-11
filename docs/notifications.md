# Notifications

Recipients are always resolved from the triggering ticket/customer/user's
own relations (never looked up globally), so a notification can never be
sent to the wrong tenant's staff — see `docs/multi-tenancy.md`.
`NotificationTemplate` is one of two tables with a platform-default +
tenant-override pattern (`system_settings` is the other): a tenant sees the
platform default until it customizes a template, at which point its edit
forks its own copy rather than changing what every other tenant sees.
Webhook events (a separate, API-consumer-facing mechanism — see
`docs/multi-tenancy.md`) fire from the same ticket-lifecycle events as the
notifications below, via their own listeners under `app/Listeners/Webhook/`.

## Flow

```
Domain event fires (e.g. TicketCreated)
        │ (after the triggering DB transaction commits)
        ▼
Queued listener (e.g. SendTicketCreatedNotification) resolves recipients
        │
        ▼
SendTicketNotificationAction
        │
        ├─▶ Look up the active NotificationTemplate for the event key
        ├─▶ For each recipient: check NotificationPreference (opt-out)
        ├─▶ Render {variables} into subject/body
        ├─▶ Write one notification_logs row (status: queued)
        └─▶ Queue a TicketEventNotification (ShouldQueue, mail channel)
                │
                ├─▶ delivered  → NotificationSent listener marks the log "sent"
                └─▶ failed     → Notification::failed() marks the log "failed" + error
```

## Why events fire after commit, not inside it

Several Actions (`AssignTicketAction`, `UpdateTicketStatusAction`, ...) wrap
their own DB transaction and dispatch an event from inside it. A queue
worker on a **separate connection** (the normal case in production, with
Redis + a `queue:work` process) could otherwise pick up the job and query
for the ticket before that transaction — or an outer one it's nested
in, as happens when `CreateTicketAction` calls `AssignTicketAction` during
ticket creation — actually commits. `config/queue.php`'s `redis` connection
sets `after_commit => true` specifically to handle this: Laravel defers the
actual queue push until the outermost transaction commits, regardless of
how deeply nested the dispatch call was. (This isn't a concern for the
`sync` driver used in tests and local dev, since that runs inline on the
same DB connection and transaction.)

## Events → listeners → recipients

| Event | Listener | Recipients |
|---|---|---|
| `TicketCreated` | `SendTicketCreatedNotification` | Customer |
| `TicketAssigned` | `SendTicketAssignedNotification` | The new assignee |
| `TicketStatusChanged` | `SendTicketStatusChangedNotification` | Customer (skipped for resolved/closed/reopened/escalated — those have their own listener below) |
| `TicketEscalated` | `SendTicketEscalatedNotification` | Department managers + senior agents + current assignee |
| `TicketResolved` | `SendTicketResolvedNotification` | Customer |
| `TicketClosed` | `SendTicketClosedNotification` | Customer |
| `TicketReopened` | `SendTicketReopenedNotification` | Current assignee, or department managers if unassigned |
| `CustomerReplied` | `SendCustomerRepliedNotification` | Current assignee, or department managers if unassigned |
| `AgentReplied` | `SendAgentRepliedNotification` | Customer |

An internal note never fires `CustomerReplied`/`AgentReplied` — see
`docs/ticket-workflow.md`.

## Templates

Seeded in `database/seeders/NotificationTemplateSeeder.php`, one row per
event key in `notification_templates`, editable via
`PUT /api/v1/notification-templates/{id}` (`notifications.manage`).
Supported variables, substituted by `TemplateRenderingService`:

```
{ticket_number} {customer_name} {agent_name} {department}
{ticket_subject} {ticket_status} {ticket_priority} {ticket_url}
```

`{ticket_url}` points at `FRONTEND_URL` (the not-yet-built React app) plus
`/tickets/{id}` — update `FRONTEND_URL` once that app exists.

## Tenant email configuration

A tenant can customize the outgoing mail its notifications are sent
with, via the same `SystemSetting` platform-default + tenant-override
mechanism `support_email`/`support_hours_message` already use (see
`SystemSettingSeeder`, `PUT /api/v1/system-settings`):

| Key | Effect | Falls back to |
|---|---|---|
| `email.sender_name` | Mail "From" display name | Platform default ("DeskNu Team") |
| `email.reply_to` | Reply-To header | `support_email`, then nothing |
| `email.branding_signature` | Closing signature line | Platform default |

`TicketEventNotification::applyTenantEmailConfig()` reads these
ambiently from the current `TenantContext` — same assumption the
template lookup just above it already makes, and the same limitation:
a real async queue worker needs its own means of re-establishing that
context (see `docs/multi-tenancy.md`), which this app's `sync` queue
driver doesn't surface.

## Preferences

Every user manages **their own** preferences via
`GET`/`PUT /api/v1/notification-preferences` — there's no admin override of
someone else's preferences, since this describes a personal inbox choice,
not a permission. It's an **opt-out** model: no `NotificationPreference` row
for a given `(user, channel, event_key)` means that notification is enabled;
a row with `enabled: false` suppresses it.

## Delivery channel

Templates have a `channel` (`mail` or `database`), but only `mail` is
currently wired to an actual delivery mechanism
(`TicketEventNotification::via()` returns `['mail']`). See
`docs/architecture.md` for why there's no separate Laravel `notifications`
table for an in-app "database" channel — `notification_logs` already
records every dispatch and is the natural backing store for a future
"my notifications" endpoint.

## Local development

Mail is captured by **Mailpit** (`docker-compose.yml`) — open
`http://localhost:8025` to see every email the app sends without
configuring a real SMTP provider. In the default host-side dev setup
(not Docker), `MAIL_MAILER=log` writes emails to `storage/logs/laravel.log`
instead.
