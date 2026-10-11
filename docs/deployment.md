# Deployment

Before going live, work through [production-checklist.md](production-checklist.md) and run
`php artisan desknu:preflight --production`, which checks the configuration for you.

## Container images

`docker/php/Dockerfile` has three targets: `development` (used by `docker-compose.yml`, source
bind-mounted), `production` (the API: code baked in, dev packages excluded) and `api-nginx` (nginx with
the application's `public/` files copied from the `production` image). Build them with
`docker-compose.prod.yml`, or directly:

```bash
docker build --target production -t supporthub-api:latest .
docker build --target api-nginx  -t supporthub-nginx:latest .
```

**Nothing environment-specific is in the image.** There is no `.env` in it (see `.dockerignore`, which keeps
`api/.env` out of the build), and Laravel's config/route/event caches are built when the **container starts**
(`docker/php/entrypoint.sh`), when the real environment exists. The same image therefore runs unchanged in
any environment. To change a setting, change the environment and **restart the containers**; no rebuild.

For AWS specifically see [aws-deployment.md](aws-deployment.md).

## Required environment variables

Everything in `api/.env.example` matters, but these need real values before
first production boot (never commit actual secrets — set these through your
hosting platform's secret/environment management):

| Variable | Notes |
|---|---|
| `APP_KEY` | Generate fresh per environment: `php artisan key:generate --show` |
| `APP_ENV=production`, `APP_DEBUG=false` | Never run `APP_DEBUG=true` in production — see `ApiExceptionRenderer`, which includes stack traces in 500 responses when debug is on |
| `APP_URL` | The public URL of this API |
| `FRONTEND_URL` | Public website URL; fallback for password reset and ticket notification links |
| `WORKSPACE_DOMAIN` | Bare parent domain for tenant subdomains; see [workspace domains](workspace-domains.md) |
| `DB_*` | Point at a real MySQL instance, not the SQLite dev default |
| `REDIS_*` | Required for `QUEUE_CONNECTION=redis` and `CACHE_STORE=redis` |
| `MAIL_*` | A real SMTP provider or API-based mailer — Mailpit is dev-only |
| `AWS_*` / `FILESYSTEM_DISK=s3` | If ticket attachments should live in object storage rather than local disk |
| `SANCTUM_TOKEN_EXPIRATION_MINUTES` | Empty means tokens never expire — consider setting this |

## Database migrations

```bash
php artisan migrate --force
```

`--force` is required because `APP_ENV=production` otherwise prompts for
confirmation, which a deploy script can't answer. Run seeders (`--seed` or
manually) **once**, for initial reference data (roles, statuses, priorities,
etc.) — `UsersSeeder` and `DemoTicketSeeder` are development/demo
conveniences and should not run against production (they create a
well-known `admin@desknu.test` / `password` account).

## Queue worker

A real worker process must run continuously — notifications are entirely
dependent on it:

```bash
php artisan queue:work redis --queue=default,notifications,reports --tries=3 --backoff=5
```

Run this under a process supervisor (systemd, supervisord, or the
container orchestrator's own restart policy) — `docker-compose.yml`'s
`queue` service shows the equivalent container form. A crashed worker means
queued notifications simply stop being sent, with no visible error at the
API layer, since ticket creation/updates already succeeded before the job
was queued.

## Scheduler

```bash
* * * * * cd /path/to/api && php artisan schedule:run >> /dev/null 2>&1
```

(or the `scheduler` container's loop) is required for any time-based
behavior to run: SLA breach checks every five minutes, hourly billing renewal
and lapse checks, and daily idempotency-key cleanup in `routes/console.php`.

## Health check

`GET /up` (Laravel's built-in health endpoint, configured in
`bootstrap/app.php`) returns 200 when the application has booted. Point
your load balancer / orchestrator's health check at this, not at an
API endpoint that requires a database round-trip to succeed.

## Reverse proxy / CORS

`docker/nginx/default.conf` is a minimal working example (PHP-FPM
passthrough, static asset handling, dotfile denial). If the frontend is
served from a different origin than the API, set `CORS_ALLOWED_ORIGINS` to the
public frontend origins. `WORKSPACE_DOMAIN` additionally allows a single valid
tenant subdomain under that parent domain, with the configured scheme and port.
See [workspace domains](workspace-domains.md) for wildcard DNS, HTTPS and frontend
hosting configuration.

## What this document does not cover

Horizontal scaling, zero-downtime deploys, database backup/restore, and
secrets management are all deliberately out of scope here — they depend
entirely on which hosting platform is chosen, which hasn't been decided as
of this phase. The application itself has no state that prevents running
multiple app containers behind a load balancer (sessions aren't used for
API auth — see `docs/authentication.md` — and the queue worker is a
separate process), which is the main architectural precondition for
scaling out.
