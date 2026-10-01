# Development

## Two ways to run this locally

### A. Host-side (fastest iteration, no Docker)

```bash
cd api
composer install
cp .env.example .env    # then edit: see below
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

The checked-in `api/.env` (not committed in a real deployment, but present
in this repo for convenience) uses **SQLite**, `QUEUE_CONNECTION=sync`, and
`MAIL_MAILER=log` — zero external services required. This is what the test
suite and day-to-day backend development used throughout this project.
Queued jobs run inline (no need for `queue:work`); emails land in
`storage/logs/laravel.log` instead of actually sending.

### B. Docker (parity with production: MySQL, Redis, real queue worker, Mailpit)

```bash
cp api/.env.example api/.env    # edit DB_PASSWORD etc. if desired
docker compose up -d
docker compose exec app php artisan migrate --seed
```

This brings up: `app` (PHP-FPM), `nginx` (:8080), `mysql` (:3306),
`redis` (:6379), `queue` (a real `queue:work` worker, not sync), `scheduler`
(runs `schedule:run` every minute), and `mailpit` (SMTP on :1025, UI on
:8025). The API is then at `http://localhost:8080/api/v1`.

**Windows + Docker Desktop:** the first `docker compose up` that bind-mounts
`./api` into a container triggers a one-time "Docker Desktop wants to share
C:\...\api" consent dialog. It must be approved from the Docker Desktop
GUI (or Settings → Resources → File Sharing, add the drive) before the
`app`/`queue`/`scheduler` containers will actually start — declining it
(or running fully headless, with no GUI session to show the prompt) leaves
them stuck in `Created` rather than `Up`, with no error beyond
`user declined directory sharing` in the compose output. This is a
Docker Desktop security feature, not a bug in `docker-compose.yml` —
the config itself was validated (`docker compose config`) and the images
build and start correctly once sharing is approved.

Switch between the two by changing `DB_CONNECTION`/`QUEUE_CONNECTION`/
`MAIL_MAILER` in `.env` — nothing else in the codebase assumes one or the
other.

## Demo accounts

`UsersSeeder` creates (password `password` for all):

| Email | Role |
|---|---|
| admin@supporthub.test | Administrator |
| manager@supporthub.test | Department Manager (Technical Support) |
| senior.agent@supporthub.test | Senior Agent (Technical Support) |
| agent1@supporthub.test | Agent (Technical Support) |
| agent2@supporthub.test | Agent (Billing) |
| agent3@supporthub.test | Agent (General Support) |
| customer1@supporthub.test | Customer (business) |
| customer2@supporthub.test | Customer (individual) |
| customer3@supporthub.test | Customer (vip) |

`DemoTicketSeeder` creates 5 sample tickets (one resolved, one with an
agent reply already posted) so the API isn't empty on first run.

## Testing

```bash
cd api
./vendor/bin/pest                       # full suite
./vendor/bin/pest tests/Feature/Ticket  # one directory
./vendor/bin/pest --filter=concurrency  # one test by name
```

Tests run against an in-memory SQLite database (`phpunit.xml`), fully
isolated from whatever `.env` points at. One test
(`TicketNumberConcurrencyTest`) is a genuine exception: it spins up 15 real
OS processes against a temporary on-disk SQLite file specifically to
exercise cross-process locking — see `docs/ticket-workflow.md`.

Code style: `./vendor/bin/pint` (Laravel Pint, already a dev dependency).

## Regenerating API documentation

Whenever a route, Form Request, or `@bodyParam`/`@response` docblock
changes:

```bash
cd api
php artisan scribe:generate
```

This rewrites `public/docs/index.html`, `public/docs/openapi.yaml`, and
`public/docs/collection.json` from the actual current routes and
docblocks — there's no hand-maintained copy to fall out of sync. Commit the
regenerated files alongside the code change that prompted them.

Every endpoint has a hand-written `@response` example (see
`config/scribe.php`'s comment on `ResponseCalls`), so generation doesn't
need a working database or valid auth token to produce complete docs.

## Adding a new domain

Following the pattern an existing one (e.g. `TicketCategory`) already
demonstrates end-to-end:

1. Migration + model (`#[Fillable([...])]` — Laravel 13's attribute-based
   mass-assignment declaration; forgetting it throws
   `MassAssignmentException` the first time something calls `::create()`).
2. Factory (if tests will need one) + seeder (if reference data).
3. Policy, registered in `AppServiceProvider::boot()` via `Gate::policy()`.
4. Form Requests (Store/Update) — validation rules **and**
   `authorize()` calling the Policy.
5. API Resource — control exactly what's serialized; never return a raw
   model from a controller.
6. Controller — thin; one Action/Service call per method; every public
   method gets a full Scribe docblock (`@group`, `@bodyParam`/`@queryParam`/
   `@urlParam`, `@response` for success and the relevant error cases).
7. Route file under `routes/api/`, required from `routes/api.php`.
8. Feature tests: the happy path, a validation failure, and an
   authorization denial, at minimum.
9. `php artisan scribe:generate`.

## Conventions worth knowing before you deviate from them

- **Controllers never contain business logic.** If a method is more than
  "validate (via Form Request) → call one Action/Service → wrap in a
  Resource → return," the logic belongs in `app/Actions` or
  `app/Services`, not the controller.
- **`auth:api`, not `auth:sanctum`**, on every protected route — see
  `docs/authentication.md` for why they're not interchangeable here.
- **Every model needs `#[Fillable([...])]`** if anything will ever
  `::create()` or `::update()` it with an array (which is almost always).
  This project was bitten by this twice during development — see the
  commit history for `TicketNumberSequence`, `AuditLog`,
  `TicketStatusHistory`, `TicketActivity`.
- **Table names**: Eloquent guesses a table name by pluralizing the
  snake_cased class name. `TicketStatusHistory` guesses
  `ticket_status_histories`, but the actual (intentionally singular, as a
  mass noun) table is `ticket_status_history` — that model has an explicit
  `protected $table = 'ticket_status_history';`. If you add a model whose
  table name doesn't follow the simple-plural convention, check this.
- **`spatie/laravel-query-builder`'s `allowedFilters()`/`allowedSorts()`
  are variadic** in the version pinned here (`^7.3`), not
  array-accepting — pass `AllowedFilter::exact('x'), AllowedFilter::exact('y')`,
  not `[AllowedFilter::exact('x'), AllowedFilter::exact('y')]`.
