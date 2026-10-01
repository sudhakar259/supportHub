# SupportHub

A customer support / ticketing system. This phase delivers the backend
only: a production-ready Laravel REST API and its complete API
documentation, intended as the stable contract for a web frontend, mobile
apps, and third-party integrations — none of which exist yet.

```
supporthub/
├── api/     Laravel 13 REST API (this phase)
├── web/     Reserved for a future React frontend (not started)
├── docs/    Architecture, API, auth, workflow, and ops documentation (this phase)
└── docker/  Dockerfiles for the local dev environment
```

## What's here

- **`api/`** — the complete backend: authentication, RBAC, the full ticket
  lifecycle (creation, numbering, routing, assignment, SLA, status
  workflow, messages, attachments), notifications, reports, audit logs,
  and settings. See [`api/README.md`](api/README.md) to run it.
- **`docs/`** — read [`docs/architecture.md`](docs/architecture.md) first;
  it explains the overall design and links to the rest (auth,
  authorization, ticket workflow, routing, notifications, development,
  deployment). [`docs/api.md`](docs/api.md) plus the generated reference in
  `api/public/docs/` are everything a frontend or mobile developer needs
  without reading any Laravel source.
- **`web/`** — intentionally empty. Per this phase's scope, no frontend
  code is written yet; the API above is the stable surface the future
  React app will be built against, mapping existing endpoints rather than
  prompting backend changes.

## Quick start

```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Or via Docker (MySQL, Redis, a real queue worker, Mailpit) — see
[`docs/development.md`](docs/development.md):

```bash
cp api/.env.example api/.env
docker compose up -d
docker compose exec app php artisan migrate --seed
```

Demo login: `admin@supporthub.test` / `password`.

## Documentation index

| Doc | Covers |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Overall design, request lifecycle, ULID-vs-bigint choice, schema deviations |
| [docs/authentication.md](docs/authentication.md) | Sanctum tokens, why `auth:api` not `auth:sanctum`, email verification, password reset |
| [docs/authorization.md](docs/authorization.md) | Roles, permissions, department-scoped ticket visibility |
| [docs/ticket-workflow.md](docs/ticket-workflow.md) | Creation pipeline, ticket numbering, status transitions, internal notes, attachments, assignment history |
| [docs/routing.md](docs/routing.md) | Routing rule conditions/actions, workload-based auto-assignment |
| [docs/notifications.md](docs/notifications.md) | Event → listener → recipient map, templates, preferences |
| [docs/api.md](docs/api.md) | Response envelope, pagination/filtering/sorting, error codes — the conventions that apply across every endpoint |
| [docs/development.md](docs/development.md) | Local setup (both paths), testing, regenerating API docs, conventions |
| [docs/deployment.md](docs/deployment.md) | Production environment variables, migrations, queue worker, scheduler |

The full endpoint-by-endpoint reference (every parameter, every validation
rule, example requests/responses, an OpenAPI 3.0 spec, and a Postman
collection) is generated from the actual code via Scribe, not
hand-maintained — see [docs/development.md](docs/development.md#regenerating-api-documentation).
