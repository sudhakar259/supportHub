# Integration Guide: Using DeskNu from Your Own Site

This guide is for a tenant that wants its own website, CRM or backend (for
example a WordPress theme or plugin) to create and read support tickets in
DeskNu. It covers getting an API key and secret, making requests,
handling errors, and receiving webhooks.

Related reference: `docs/authentication.md` (how credentials are checked) and
`docs/multi-tenancy.md` (scopes, customer identity, webhooks).

## How it works

```
Visitor's browser → your site's server (PHP/Node/...) → DeskNu /api/v1/integration/*
                                  ▲
                      API key + secret live only here
```

Your server calls DeskNu with an **API key + secret pair**. There is no
login and no token. The pair identifies your organisation (tenant), so every
request only ever sees your own customers and tickets.

> **Never put the secret in browser JavaScript, a public theme file, or a
> mobile app.** Anyone who has it can act as your integration. All calls must
> be made from your server.

Base URL: `https://<your-desknu-host>/api/v1/integration`
(local development: `http://localhost:8082/api/v1/integration`).

## 1. Get an API key and secret

A tenant admin creates the credential. First log in to get a Bearer token:

```bash
curl -X POST https://HOST/api/v1/auth/login \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"...","tenant":"your-tenant-slug"}'
```

Then create the credential with the token from the response:

```bash
curl -X POST https://HOST/api/v1/api-credentials \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"name":"WordPress site","scopes":["customers.read","customers.create","tickets.read","tickets.create","tickets.reply"]}'
```

The response contains the key (`ak_...`) and the secret (`as_...`).
**The secret is shown only once** and cannot be retrieved later (only a hash
is stored). Save it straight away in a secrets store or server config.

Manage credentials with these calls (all need the admin Bearer token):

| Action | Request |
|---|---|
| List / view | `GET /api-credentials`, `GET /api-credentials/{id}` |
| Change name or scopes | `PUT /api-credentials/{id}` |
| Replace the secret (old one stops working immediately) | `POST /api-credentials/{id}/rotate` |
| Disable permanently | `POST /api-credentials/{id}/revoke` |

Give each integration its own credential and only the scopes it needs.

### Scopes

| Scope | Allows |
|---|---|
| `customers.read` | list, view and look up customers |
| `customers.create` | create customers |
| `customers.update` | update customers |
| `tickets.read` | list and view tickets |
| `tickets.create` | create tickets |
| `tickets.update` | edit subject, description, category, priority |
| `tickets.reply` | add a reply to a ticket |
| `tickets.status.update` | change ticket status (any valid transition) |
| `tickets.reopen` | reopen a resolved or closed ticket (and nothing else) |
| `tickets.attachments` | list and upload attachments |

A request to an endpoint whose scope the credential lacks returns `403`.

## 2. Authenticate every request

Send both headers on every call:

```
X-Api-Key: ak_...
X-Api-Secret: as_...
Accept: application/json
```

```bash
curl https://HOST/api/v1/integration/tickets \
  -H "X-Api-Key: ak_..." -H "X-Api-Secret: as_..." -H "Accept: application/json"
```

Always send `Accept: application/json`, otherwise errors may come back as HTML.

## 3. Endpoints

All paths are relative to `/api/v1/integration`.

### Customers

| Method & path | Scope | Notes |
|---|---|---|
| `GET /customers` | `customers.read` | paginated, `?per_page=` (max 100) |
| `GET /customers/lookup?email=` or `?external_id=` | `customers.read` | `404` if not found |
| `GET /customers/{id}` | `customers.read` | |
| `POST /customers` | `customers.create` | see below |
| `PUT /customers/{id}` | `customers.update` | `phone`, `company_name`, `customer_type`, `external_id` |

Create a customer:

```json
{
  "name": "Jamie Rivera",
  "email": "jamie@example.com",
  "phone": "+1-555-0100",
  "company_name": "Acme Corp",
  "customer_type": "individual",
  "external_id": "wp-user-7842"
}
```

`name` and `email` are required; the email must be unique within your tenant.
`customer_type` is `individual`, `business` or `vip`. `send_invite` (optional,
default `false`) emails the customer a link to choose their own password, so they
can sign in to DeskNu and follow their tickets; without it the customer can
only be reached through your integration, because they have no password. Opening
the link also confirms their email address. `external_id` is your own
identifier for this person (for example the WordPress user ID). It lets you
find the customer later without storing DeskNu's numeric ID.

### Lookups (ids for your "new ticket" form)

| Method & path | Scope | Returns |
|---|---|---|
| `GET /priorities` | `tickets.create` | all priorities (`id`, `name`, `slug`, `level`, `is_default`) |
| `GET /departments` | `tickets.create` | **active** departments (`id`, `name`, `code`, `description`) |
| `GET /categories` | `tickets.create` | **active** categories |

Use them to build the dropdowns on your form, and cache the results (they
rarely change). The ids belong to your tenant. Only show the customer the
choices you want them to pick: these endpoints return everything that is
active, including departments you may consider internal.

### Tickets

| Method & path | Scope | Notes |
|---|---|---|
| `GET /tickets` | `tickets.read` | `?customer_id=`, `?per_page=` (max 100) |
| `GET /tickets/{id}` | `tickets.read` | |
| `GET /tickets/{id}/messages` | `tickets.read` | the conversation thread, oldest first (see below) |
| `POST /tickets` | `tickets.create` | see below |
| `PUT /tickets/{id}` | `tickets.update` | `subject`, `description`, `category_id`, `priority_id` |
| `POST /tickets/{id}/messages` | `tickets.reply` (+ `tickets.attachments` if sending files) | JSON `{"body": "..."}`, or multipart with `attachments[]` files (see below) |
| `POST /tickets/{id}/status` | `tickets.status.update` | body: `{"status": "resolved", "reason": "..."}` |
| `POST /tickets/{id}/reopen` | `tickets.reopen` | body: `{"reason": "..."}` (optional); see below |
| `GET /tickets/{id}/attachments` | `tickets.attachments` | |
| `POST /tickets/{id}/attachments` | `tickets.attachments` | multipart field `file` |

Create a ticket:

```json
{
  "subject": "Cannot access my account",
  "description": "I get a 500 error at login.",
  "customer_external_id": "wp-user-7842",
  "department_id": 2,
  "category_id": 2,
  "priority_id": 3
}
```

- `subject` and `description` are required.
- Identify the customer with **one** of `customer_id`, `customer_email` or
  `customer_external_id`.
- **The customer must already exist.** An unknown customer returns `404`
  (`No matching customer found for the given identifier.`). The ticket call
  does not create customers, so look the customer up first and create them if
  missing (see the flow below).
- `department_id`, `category_id` and `priority_id` are optional and must
  belong to your tenant (a department must also be active). Get the ids from
  the lookup endpoints above. Without `priority_id` the tenant's default
  priority is used. A routing rule configured in DeskNu may still change
  the department or priority after creation.
- Don't pass a number straight from the browser: check on your server that the
  submitted department and priority are ones you offer (otherwise any visitor
  could mark every ticket Urgent).

Show the conversation on your site with `GET /tickets/{id}/messages`. It
returns customer messages and **agent replies**, oldest first, and never
internal notes:

```json
{ "success": true, "data": [
  { "id": "01HXYZ...", "type": "customer_message", "body": "Any update?", "author_name": "Jamie Rivera", "created_at": "2026-10-09T10:00:00+00:00" },
  { "id": "01HXZA...", "type": "agent_reply",      "body": "We are looking into it.", "author_name": "Sam", "created_at": "2026-10-09T10:05:00+00:00" }
] }
```

`type` is `customer_message` or `agent_reply`. Authors are limited to a display
name (no email or role). Agent replies appear here as soon as the agent posts
them, so poll this endpoint or use the `ticket.replied` webhook (section 6) to
refresh your page.

**Reopening a ticket.** If an agent resolves or closes a ticket but the
problem isn't actually fixed, the customer can reopen it from your site:

```bash
curl -X POST https://HOST/api/v1/integration/tickets/12/reopen \
  -H "X-Api-Key: ak_..." -H "X-Api-Secret: as_..." \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"reason":"The issue came back after the fix."}'
```

The ticket moves to `reopened`, the reopen count goes up, the resolved/closed
dates are cleared and the assigned team is notified. Only `resolved` and
`closed` tickets can be reopened; any other state returns `422`. Prefer this
endpoint over `/status` for customer-facing buttons: it can only reopen, so
your site can't accidentally resolve or close tickets. Show a "Reopen" button
only when the ticket's `status.slug` is `resolved` or `closed`, and after
checking the ticket belongs to the logged-in user. Existing credentials need
the new `tickets.reopen` scope added (`PUT /api-credentials/{id}`).

Status values: `open`, `in-progress`, `pending`, `escalated`, `resolved`,
`closed`, `reopened`. Invalid transitions (for example `closed` to `open`)
return `422`.

Attachments: max **2 MB** per file; allowed types are jpg, jpeg, png, webp, txt,
pdf, docx, ppt, pptx (anything else returns `422`).

**Replying with files.** To attach files to a reply, send the reply as
`multipart/form-data` with a `body` field and up to 5 `attachments[]` files
(2 MB each; jpg, jpeg, png, webp, txt, pdf, docx, ppt, pptx). The files are
linked to that reply, and `GET /tickets/{id}/messages` lists them under each
message's `attachments` (`id`, `original_filename`, `mime_type`, `size`). Sending
files needs the `tickets.attachments` scope as well as `tickets.reply`; without
it the call returns `403` and nothing is posted. If any file is invalid the
whole request returns `422` and the reply is not posted.

```bash
curl -X POST https://HOST/api/v1/integration/tickets/12/messages \
  -H "X-Api-Key: ak_..." -H "X-Api-Secret: as_..." -H "Accept: application/json" \
  -F "body=Screenshot attached" \
  -F "attachments[]=@error.png" -F "attachments[]=@log.txt"
```

In WordPress, send it with `wp_remote_post` and a multipart body (or cURL via
`CURLFile`); `wp_remote_request` with a JSON body can't carry files.

**Creating a ticket with files.** `POST /tickets` accepts the same `attachments[]`
(multipart, up to 5 files, 2 MB each, needs `tickets.attachments` as well as
`tickets.create`). The files belong to the ticket itself, show in DeskNu as
part of the ticket's "Original request", and come back in the `attachments` list
of the create response and of `GET /tickets/{id}`.

Files uploaded separately with `POST /tickets/{id}/attachments` are also ticket
files (shown with the original request), not tied to a specific reply.

**Replies and attachments sent through this API are attributed to the ticket's
customer.** This API cannot post as an agent. Agents reply from the DeskNu
app.

### Typical flow for a logged-in site user

1. `GET /customers/lookup?external_id=wp-user-7842`.
2. On `404`, `POST /customers` with the user's name, email and the same
   `external_id`.
3. `POST /tickets` with `customer_external_id`.
4. To show "My tickets": `GET /tickets?customer_id=<id>` using the `id` from
   step 1 or 2.
5. To show the conversation: `GET /tickets/{id}/messages` (after the ownership check below).
6. To let the user reply: first check that the ticket's customer is the
   logged-in user, then `POST /tickets/{id}/messages`.

**Authorise on your side.** The credential can see every ticket in your
tenant. Your server must make sure a visitor only reads or replies to their
own tickets. Never take a ticket ID from the browser and forward it without
checking that it belongs to that user.

## 4. Responses and errors

Success:

```json
{ "success": true, "message": "Ticket created successfully.", "data": { "id": 12, "ticket_number": "TKT-2026-000012" } }
```

Errors always have `"success": false` and a `message`.

| Status | Meaning |
|---|---|
| `401` | Missing, invalid or revoked credentials, or the tenant is suspended |
| `403` | Credential lacks the scope for this endpoint |
| `404` | Customer or record not found (also for records of another tenant) |
| `409` | A request with the same `Idempotency-Key` is still being processed |
| `422` | Validation failed; field messages are in `errors` |
| `429` | Rate or plan limit exceeded |

Plan limits (for example tickets per month, number of customers) apply to
creation calls and return an error when reached.

### Rate limit

Integration calls are limited per credential per day, by your plan
(`api_requests_per_day`). Some plans are unlimited. When exceeded, you get `429`
with `errors.limit` and `errors.retry_after_seconds`. Back off until then.

### Safe retries with `Idempotency-Key`

For `POST /tickets`, `/tickets/{id}/messages`, `/tickets/{id}/status` and
`/tickets/{id}/attachments`, you can send an `Idempotency-Key` header
(unique string, up to 255 characters) so a network retry doesn't create a
duplicate:

```
Idempotency-Key: 6f1c1d5e-8c1f-4a52-9d52-0a3f6a2b7f10
```

- Same key and same body: you get the stored first response, with the header
  `Idempotent-Replayed: true`. Nothing is created twice.
- Same key and a different body: rejected.
- Keys are remembered for 24 hours. A failed (5xx) attempt can be retried with
  the same key.
- Generate a new key per user action (for example a form submission), not per
  retry.

## 5. Example: WordPress (theme or plugin)

Store the credentials in `wp-config.php` (not in a theme file under version
control):

```php
define('DESKNU_URL',    'https://support.example.com/api/v1/integration');
define('DESKNU_KEY',    'ak_...');
define('DESKNU_SECRET', 'as_...');
```

Helper (put in `functions.php` or a plugin):

```php
function sh_request($method, $path, $body = null, $idempotency_key = null) {
    $headers = [
        'X-Api-Key'    => DESKNU_KEY,
        'X-Api-Secret' => DESKNU_SECRET,
        'Accept'       => 'application/json',
        'Content-Type' => 'application/json',
    ];
    if ($idempotency_key) {
        $headers['Idempotency-Key'] = $idempotency_key;
    }
    $args = ['method' => $method, 'timeout' => 15, 'headers' => $headers];
    if ($body !== null) {
        $args['body'] = wp_json_encode($body);
    }

    $res = wp_remote_request(DESKNU_URL . $path, $args);
    if (is_wp_error($res)) {
        return $res;
    }
    $data = json_decode(wp_remote_retrieve_body($res), true);
    $data['_status'] = wp_remote_retrieve_response_code($res);
    return $data;
}

// Find or create the DeskNu customer for the current WP user.
function sh_customer_for_user(WP_User $u) {
    $ext = 'wp-user-' . $u->ID;
    $res = sh_request('GET', '/customers/lookup?external_id=' . rawurlencode($ext));
    if (!is_wp_error($res) && ($res['_status'] ?? 0) === 200) {
        return $res['data'];
    }
    $res = sh_request('POST', '/customers', [
        'name'        => $u->display_name,
        'email'       => $u->user_email,
        'external_id' => $ext,
    ]);
    return (!is_wp_error($res) && ($res['_status'] ?? 0) === 201) ? $res['data'] : null;
}

// Create a ticket for the current user. Pass one unique key per form submit.
function sh_create_ticket($subject, $description, $submit_key) {
    $u = wp_get_current_user();
    $customer = sh_customer_for_user($u);
    if (!$customer) {
        return new WP_Error('sh_customer', 'Could not resolve customer.');
    }
    return sh_request('POST', '/tickets', [
        'subject'              => sanitize_text_field($subject),
        'description'          => sanitize_textarea_field($description),
        'customer_external_id' => 'wp-user-' . $u->ID,
    ], $submit_key);
}

// Tickets for the current user only.
function sh_my_tickets() {
    $customer = sh_customer_for_user(wp_get_current_user());
    return $customer ? sh_request('GET', '/tickets?customer_id=' . (int) $customer['id']) : null;
}
```

Call these from a form handler or an AJAX action (`wp_ajax_*`) that checks a
nonce and that the user is logged in. Don't expose the helper to the front end.

## 6. Webhooks: get notified of changes

Instead of polling, your site can receive an HTTP POST when something happens
(an agent replies, a ticket is resolved). A tenant admin registers the
endpoint with `POST /api/v1/webhooks` (Bearer token) and a list of events:

`ticket.created`, `ticket.assigned`, `ticket.replied` (agent and customer
replies), `ticket.status_changed`, `ticket.resolved`, `ticket.closed`,
`ticket.reopened`. (`ticket.updated` exists but nothing sends it yet.)

The create response contains a signing secret (`whsec_...`) shown once.
Other calls: `GET /webhooks`, `PUT /webhooks/{id}`, `DELETE /webhooks/{id}`,
`GET /webhooks/{id}/deliveries` (delivery history), `POST /webhooks/{id}/test`
(sends a test event) and `POST /webhooks/{id}/rotate-secret`.

The URL must be public; private, loopback and link-local addresses are
rejected, so `localhost` can't be used. For local testing use a tunnel.

Each delivery is a JSON POST:

```json
{ "event": "ticket.replied", "data": { ... }, "timestamp": "2026-10-09T12:00:00+00:00" }
```

with headers `X-Webhook-Event` and `X-Webhook-Signature`. The signature is an
**HMAC-SHA256 of the raw request body**, hex-encoded, keyed with your
`whsec_...` secret. Verify it before trusting the request (WordPress example):

```php
add_action('rest_api_init', function () {
    register_rest_route('desknu/v1', '/webhook', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => function (WP_REST_Request $req) {
            $raw      = $req->get_body();
            $expected = hash_hmac('sha256', $raw, DESKNU_WEBHOOK_SECRET);
            $given    = $req->get_header('x-webhook-signature');
            if (!$given || !hash_equals($expected, $given)) {
                return new WP_REST_Response(['error' => 'bad signature'], 401);
            }
            $payload = json_decode($raw, true);
            // handle $payload['event'] / $payload['data'] ...
            return new WP_REST_Response(['ok' => true], 200);
        },
    ]);
});
```

Reply with any `2xx` within 10 seconds. Failed deliveries are retried with
backoff (10 s, 60 s, 5 min, 15 min), up to 5 attempts. Handle duplicates: the
same event can arrive more than once.

## 7. Security checklist

- Keep the secret on the server only; load it from config or environment.
- One credential per integration, with minimum scopes.
- Rotate the secret if it may have leaked (`POST /api-credentials/{id}/rotate`),
  and revoke credentials you no longer use.
- Use HTTPS in production for both DeskNu and your webhook endpoint.
- Check on your server that a visitor owns the ticket before showing or
  replying to it.
- Always verify the webhook signature, using a constant-time comparison.
- Sanitize user input before sending it, and escape ticket content when you
  print it in a page.

## 8. Quick test

```bash
export H='-H "Accept: application/json" -H "X-Api-Key: ak_..." -H "X-Api-Secret: as_..."'
curl -s http://localhost:8082/api/v1/integration/customers $H
```

A `401` means the key or secret is wrong or revoked; a `403` means the scope is
missing; a `200` means you're connected.
