# Deployment

## Container image

`docker/php/Dockerfile` has a `production` build target (the `development`
target, used by `docker-compose.yml`, bind-mounts source instead of baking
it in and skips the optimize steps):

```bash
docker build --target production -t supporthub-api:latest .
```

That target copies the application in, runs
`composer install --no-dev --optimize-autoloader`, and caches config,
routes, and events (`config:cache`, `route:cache`, `event:cache`) at build
time. **If you change any `.env` value after building the image, you must
re-run those cache commands** (or just rebuild) — a cached config is
frozen at build time and won't re-read the environment.

## Required environment variables

Everything in `api/.env.example` matters, but these need real values before
first production boot (never commit actual secrets — set these through your
hosting platform's secret/environment management):

| Variable | Notes |
|---|---|
| `APP_KEY` | Generate fresh per environment: `php artisan key:generate --show` |
| `APP_ENV=production`, `APP_DEBUG=false` | Never run `APP_DEBUG=true` in production — see `ApiExceptionRenderer`, which includes stack traces in 500 responses when debug is on |
| `APP_URL` | The public URL of this API |
| `FRONTEND_URL` | Used only to build links in notification emails (`{ticket_url}`) |
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
well-known `admin@supporthub.test` / `password` account).

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
behavior — e.g. a future SLA-breach-escalation check — to run at all.
Nothing is currently scheduled by default, but the mechanism should be
running before anything is added to `routes/console.php`'s schedule.

## Health check

`GET /up` (Laravel's built-in health endpoint, configured in
`bootstrap/app.php`) returns 200 when the application has booted. Point
your load balancer / orchestrator's health check at this, not at an
API endpoint that requires a database round-trip to succeed.

## Reverse proxy / CORS

`docker/nginx/default.conf` is a minimal working example (PHP-FPM
passthrough, static asset handling, dotfile denial). If the frontend is
served from a different origin than the API, configure
`config/cors.php`'s `allowed_origins` — it ships with Laravel's permissive
default, which should be narrowed before production launch.

## What this document does not cover

Horizontal scaling, zero-downtime deploys, database backup/restore, and
secrets management are all deliberately out of scope here — they depend
entirely on which hosting platform is chosen, which hasn't been decided as
of this phase. The application itself has no state that prevents running
multiple app containers behind a load balancer (sessions aren't used for
API auth — see `docs/authentication.md` — and the queue worker is a
separate process), which is the main architectural precondition for
scaling out.
