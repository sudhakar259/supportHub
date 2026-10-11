# DeskZeal

A multi-tenant customer support platform with a Laravel REST API and React
frontend. Includes a public SaaS website, organization signup, ticket workflows,
team administration, integrations, reports and subscription billing.

```
supporthub/
├── api/     Laravel 13 REST API
├── web/     React application and public SaaS website
├── docs/    Architecture, API, frontend, workflow and operations guides
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
  `api/resources/developer-docs/reference/` (available after workspace sign-in
  under **Integrations → Developer Docs**) are everything a frontend or mobile developer needs
  without reading any Laravel source.
- **`web/`** — the React frontend, including a public homepage, product
  and solution pages, interactive demo, API-backed pricing and workspace
  signup. The authenticated app manages tickets, customers, departments,
  roles, automation, integrations and billing. See
  [`web/README.md`](web/README.md) and [`docs/public-site.md`](docs/public-site.md).

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

Demo login: `admin@deskzeal.test` / `password`.

To run the frontend, follow [`web/README.md`](web/README.md).

## Documentation index

| Doc | Covers |
|---|---|
| [docs/public-site.md](docs/public-site.md) | Public routes, product tour, pricing, signup and frontend hosting |
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

Branding, public SEO, hosting configuration and remaining launch inputs: see
[docs/branding-seo.md](docs/branding-seo.md).
