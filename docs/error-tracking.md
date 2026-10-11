# Error tracking

When something breaks for a customer, you should hear about it from an alert, with enough detail to fix it, not from the
customer. SupportHub reports errors to [Sentry](https://sentry.io) (a hosted error-tracking service) when you give it a key.
**Without a key nothing is sent**, and the product behaves exactly as before.

## What you get

- **Server errors** (the API, background jobs, the scheduler): any exception nobody expected, with where it happened and the
  request path. Expected outcomes such as a wrong password, a validation error, a missing record, a plan limit being reached,
  a status change the workflow forbids, or a customer's webhook endpoint being down are **not** reported: they are not bugs.
- **Browser errors**: a page that crashes, an unhandled error or a failed page load, in the web app.
- **A reference number on every crash screen.** When a page crashes the person sees "Something went wrong" and a short
  reference such as `17c06bab`. The same reference is attached to the report as the `reference` tag, so when a customer quotes
  it you search for `reference:17c06bab` and land on the exact error.
- **The deploy it came from.** Each report carries a `release`: the git commit of the deployed image (API) and of the web build.

## What is never sent

This matters for the Privacy Policy, which describes it.

| Never leaves your systems | How |
|---|---|
| Names, email addresses, who was signed in | No user is attached to reports; emails and tokens inside error messages are redacted |
| Passwords, API keys and secrets, cookies, authorization headers | Stripped from every report |
| Request bodies (ticket text, form contents) | Not collected |
| URL query strings (password-reset links carry a token and an email) | Removed; only the path is kept |
| Console output and server log lines | Not attached |
| SQL values | Not attached (a database error's message is also redacted for emails and tokens) |

The code that enforces this is `api/app/Support/SentryScrubber.php` and `web/src/lib/errorReporting.ts`, and both are covered
by tests. The Sentry browser library collects cookies, headers, bodies and query strings **by default**; the app turns every one
of them off explicitly, so keep `dataCollection` as it is in `errorReporting.ts` if you upgrade Sentry.

## Setup (about 15 minutes)

1. Create a Sentry account. Choose the **data region** (US or EU) that matches your customers; it cannot be changed later.
2. Create **two projects**: one of type **Laravel** (for the API) and one of type **React** (for the website). Keeping them
   separate lets you assign and silence them independently.
3. Copy each project's **DSN** (the key; Settings → Client Keys).
4. **API:** set these in Parameter Store (or your `.env`), then deploy:
   ```
   SENTRY_LARAVEL_DSN=https://…@o….ingest.sentry.io/…
   SENTRY_ENVIRONMENT=production
   ```
   `SENTRY_RELEASE` is filled in automatically from the image tag.
5. **Website:** the key is compiled into the files, so pass it when you publish:
   ```bash
   VITE_SENTRY_DSN=https://…@o….ingest.sentry.io/… ./deploy/aws/deploy-web.sh
   ```
   (with the other variables from [aws-deployment.md](aws-deployment.md)). `VITE_RELEASE` defaults to the git commit. The build
   adds exactly one address to the page's Content-Security-Policy: the Sentry host named in the key.
6. **Check it works** (see below), then set up alerts.

### Check it works

- **API:** on the server run
  `docker compose --env-file /opt/supporthub/.env.production -f /opt/supporthub/app/docker-compose.prod.yml exec app php artisan sentry:test`
  and look for the event in Sentry within a minute.
- **Website:** in the browser console of the live site run `throw new Error('Sentry test')` from a page, or temporarily visit a page that
  you know crashes in a staging copy. The report should arrive tagged with your `release`.
- **Configuration:** `php artisan supporthub:preflight --production` shows a warning ("Errors are reported to a tracking service")
  until `SENTRY_LARAVEL_DSN` is set. It is a warning, not a failure: this is your decision, but it is a strongly advised one.

## Alerts worth setting

In Sentry → Alerts: email (or chat) you for **a new issue** in production, and for **an issue that happens more than ~10 times in
10 minutes**. Add the website project too. Mark issues Resolved when you ship the fix, and Sentry will reopen them if it comes back.

## Cost and volume

Sentry has a free tier and paid plans by event volume. To keep volume (and noise) down: the app already drops expected errors, browser
extensions' errors and the harmless `ResizeObserver` notice; performance tracing and session replay are **off**. Turn tracing on only
deliberately (`SENTRY_TRACES_SAMPLE_RATE` for the API), because it sends more data.

## If you prefer a different service

All reporting goes through two small places: `web/src/lib/errorReporting.ts` (browser) and the `Integration::handles(...)` line in
`api/bootstrap/app.php` plus `config/sentry.php` (server). Bugsnag, Flare and others have Laravel and browser SDKs that plug in
at the same points; keep the redaction in `SentryScrubber` / `redact()` when you swap.
