# Authentication

SupportHub uses **Laravel Sanctum personal access tokens** (Bearer tokens),
not cookie-based SPA sessions. This is deliberate: the API has to serve a
future React web app, native mobile apps, and third-party integrations
equally, and a Bearer token works identically for all three, whereas
Sanctum's cookie/session mode is specifically designed for a single
first-party SPA sharing a domain with the API.

Every authenticated endpoint expects:

```
Authorization: Bearer {token}
```

## Getting a token

`POST /api/v1/auth/register` (customer self-service signup) or
`POST /api/v1/auth/login` both return a token on success:

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
