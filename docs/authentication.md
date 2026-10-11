# Authentication

DeskZeal uses **Laravel Sanctum personal access tokens** (Bearer tokens),
not cookie-based SPA sessions. This is deliberate: the API has to serve a
future React web app, native mobile apps, and third-party integrations
equally, and a Bearer token works identically for all three, whereas
Sanctum's cookie/session mode is specifically designed for a single
first-party SPA sharing a domain with the API.

This covers person-authenticated access (a human logging into a tenant's
workspace, or a customer's own portal). A tenant's *own backend systems*
authenticate differently — via an API key + secret pair, with no person or
Sanctum session involved at all — see "Integration API authentication"
below and `docs/multi-tenancy.md` for the full picture.

Every authenticated endpoint expects:

```
Authorization: Bearer {token}
```

## Getting a token

`POST /api/v1/auth/register` (customer self-service signup **within an
existing tenant** — requires a `tenant` slug; see `docs/multi-tenancy.md`
for `POST /tenants/register`, which creates a brand-new tenant instead) or
`POST /api/v1/auth/login` both return a token on success. Email is unique
per tenant, not globally, so `login` accepts an *optional* `tenant` slug to
disambiguate when the same address has accounts in more than one tenant —
omitted, it tries every matching account against the given password, which
is unambiguous unless two of them also happen to share that exact
password:

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "id": 1, "name": "...", "email": "...", "roles": ["Agent"] },
    "token": "1|abcdef0123456789...",
    "token_type": "Bearer"
  }
}
```

Pass an optional `device_name` on either endpoint (e.g. `"iphone-15"`,
`"web-browser"`) so each device gets its own named, independently-revocable
token. A user can be logged in on several devices at once; logging out
(`POST /api/v1/auth/logout`) revokes only the token used to make that
request.

## Token lifetime

Tokens do not expire by default (`SANCTUM_TOKEN_EXPIRATION_MINUTES` in
`.env` is empty). Set it to a number of minutes to force re-authentication
after that period. There is currently no refresh-token flow — a mobile
client should treat a `401 Unauthenticated` response as "log in again,"
not as "something is broken."

## Why `auth:api`, not `auth:sanctum`

Sanctum's own service provider auto-registers a guard literally named
`sanctum` (with `provider => null`) as a convenience, independent of
anything in `config/auth.php`. This project instead defines its own guard:

```php
// config/auth.php
'defaults' => ['guard' => 'api'],
'guards' => [
    'api' => ['driver' => 'sanctum', 'provider' => 'users'],
],
```

Using the auto-registered `sanctum` guard in route middleware while the
*default* guard is `api` causes `$request->user()` (which resolves against
the *default* guard) to disagree with what the `auth:sanctum` middleware
just authenticated — in testing this surfaced as `actingAs($user, 'api')`
getting a 401 from a route protected by `auth:sanctum`. Every protected
route in this project uses `auth:api` precisely to keep the authenticating
guard and the default guard the same one. If you add a new route, use
`auth:api`, not `auth:sanctum`.

## Email verification

`POST /api/v1/auth/register` fires Laravel's `Registered` event, which
queues a verification email (`Illuminate\Auth\Notifications\VerifyEmail`).
The link in that email points at `GET /api/v1/auth/email/verify/{id}/{hash}`
— a signed, throttled URL. Nothing in this API currently *requires* a
verified email to use other endpoints; `email_verified_at` is simply
exposed on the user resource so a frontend can prompt for it if desired.
`POST /api/v1/auth/email/verification-notification` resends the email for
an authenticated-but-unverified user.

## Password reset

`POST /api/v1/auth/forgot-password` always returns the same generic success
message regardless of whether the email is registered — intentionally, to
avoid leaking which email addresses have an account (a standard OWASP
recommendation). `POST /api/v1/auth/reset-password` completes the reset and
revokes all of that user's existing tokens, forcing re-login everywhere.

Both accept the same optional `tenant` slug as login, for the same
reason — the same email can be a different account per tenant. Specifying
it is the safer choice whenever that might be the case: Laravel's password
broker resolves the account by email alone, so omitting `tenant` when two
tenants share an email means whichever account the lookup query returns
first is the one that gets the reset link/password change, not necessarily
the one the caller meant. See `docs/multi-tenancy.md` for how this is
wired (`AuthController::passwordResetCredentials()`).

## Integration API authentication

`/api/v1/integration/*` (a tenant's own backend, CRM, or chat widget) does
not use Sanctum at all. Instead:

```
X-Api-Key: ak_...
X-Api-Secret: as_...
```

The key identifies an `ApiCredential` row; the secret is checked against
its bcrypt hash (never recoverable, only verifiable — unlike a webhook
secret, which must be re-readable to sign deliveries and is encrypted
rather than hashed). The credential's own `tenant_id` becomes the request's
tenant context — exactly as unforgeable as a Sanctum user's. A revoked
credential, or a credential belonging to a suspended tenant, is rejected
before any route logic runs. Each credential also carries a `scopes` array;
an endpoint whose required scope the credential lacks returns `403`
regardless of how the key/secret check went. See `docs/multi-tenancy.md`
for the full scope list and `/api/v1/api-credentials` (credential
management, Sanctum-authenticated, for tenant admins).

For a step-by-step guide to using this from a client's own site (including
WordPress and webhooks), see `docs/integration-guide.md`.

## Rate limiting

`auth/register`, `auth/login`, `auth/forgot-password`, and
`auth/reset-password` share a stricter limiter (10 requests/minute/IP,
`RateLimiter::for('auth', ...)` in `AppServiceProvider`) than the general
API limit (120/minute/user-or-IP), to slow down credential stuffing and
enumeration attempts. Email verification endpoints are throttled
separately at 6/minute.

## For mobile developers

There is no OAuth dance, no CSRF cookie, and no session to manage. The
entire flow is:

1. `POST /auth/register` or `/auth/login` → store the returned `token`
   securely (Keychain / Keystore, not plain prefs/localStorage).
2. Send it as `Authorization: Bearer {token}` on every subsequent request.
3. On `401`, discard the token and send the user back to login.
4. `POST /auth/logout` when the user signs out, to revoke that device's
   token server-side.


## Account lockout

After `LOCKOUT_MAX_ATTEMPTS` (default 5) wrong passwords, or wrong two-factor codes, in a
row, an account is locked for `LOCKOUT_MINUTES` (default 15). While it is locked, `/auth/login`
answers `423 Locked` with `retry_after_seconds` **before** looking at the password, so a
correct guess made during the lock reveals nothing. The count is per account (an email in two
workspaces is two accounts) and resets on a successful sign-in. These also clear it:

- an administrator unlocking the user (`POST /users/{user}/unlock`, `users.update`), shown as a
  "Locked" badge on the Users page;
- completing a password reset from the emailed link.

Locking is recorded in the audit log as `auth.account_locked`. The per-IP limiter on the
sign-in routes (`throttle:auth`) still applies on top.

## Two-factor authentication

Anyone can protect their own account with an authenticator app (TOTP, RFC 6238: Google
Authenticator, Microsoft Authenticator, 1Password, Authy). In the web app: **Account menu →
Account security**.

| Step | Endpoint |
|---|---|
| Start: returns the secret and the `otpauth://` link for the QR code | `POST /auth/two-factor/setup` `{password}` |
| Turn on with a first code; returns 8 recovery codes **once** | `POST /auth/two-factor/confirm` `{code}` |
| Turn off | `POST /auth/two-factor/disable` `{password, code \| recovery_code}` |
| Replace the recovery codes | `POST /auth/two-factor/recovery-codes` `{password, code}` |

Each of these asks for the current password again. Two-factor only counts as on after the
confirm step, so a half-finished setup can't lock anyone out.

**Signing in** with it on is two requests:

1. `POST /auth/login` returns `{"two_factor_required": true, "challenge_token": "…"}` and **no
   token**. The challenge token lives for 5 minutes and works once.
2. `POST /auth/two-factor/challenge` with `challenge_token` and either `code` (6 digits) or
   `recovery_code` returns the token, exactly like a normal login.

Details that matter: a code is accepted for the current 30-second step and one either side (clock
drift), and **each step only once**, so a code that was used (or sniffed) cannot be replayed; a
recovery code works once and is then gone; the secret is encrypted at rest and never returned
after setup; recovery codes are stored as keyed hashes. Wrong codes count toward the lockout.

Lost phone and lost recovery codes: an administrator can switch it off
(`DELETE /users/{user}/two-factor`), which also signs that person out everywhere. Administrators
cannot reset their own that way.

API tokens and integration credentials (`X-Api-Key` / `X-Api-Secret`) are not affected: two-factor
protects interactive sign-in only. Changing `APP_KEY` makes stored two-factor secrets unreadable.

## Customer data requests

For a person's right to see or have erased what you hold about them (Administrators, via the
customer's page or the API):

- `GET /customers/{customer}/export` (`customers.export`): a JSON file with their profile, tickets,
  messages, attachment names and the notifications and emails on record. Internal staff notes are
  left out and staff are not named.
- `POST /customers/{customer}/erase` (`customers.erase`): body `{confirm_email, redact_content}`.
  **Irreversible.** Their name, email, phone, company and sign-in are replaced; their tokens are
  deleted; the audit trail and the inbound-email log are scrubbed. With `redact_content` (the
  default) the text of their tickets, every message and the attachments are removed as well, but
  ticket numbers, dates and statuses stay so reports are unchanged. Backups are not touched.
- `GET /exports/tickets` (`reports.view`, optional `from` / `to`) and `GET /exports/customers`
  (`customers.view`): CSV downloads. Cells that start with `= + - @` are neutralized so a hostile
  ticket subject can't run as a spreadsheet formula.

Plain "delete customer" only hides them (a soft delete); use erase for a real removal.
