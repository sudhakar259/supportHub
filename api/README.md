# DeskZeal API

Laravel 13 REST API for DeskZeal — see the [project root README](../README.md)
for the overall picture and [`docs/`](../docs/) for architecture, auth,
authorization, ticket workflow, routing, notifications, development, and
deployment documentation.

## Quick start

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Demo login: `admin@deskzeal.test` / `password` (see
[`docs/development.md`](../docs/development.md) for the full account list).

## Tests

```bash
./vendor/bin/pest
```

## API documentation

```bash
php artisan scribe:generate
```

Then sign in to a tenant workspace and open **Integrations → Developer Docs**.
The guide, endpoint reference, OpenAPI download and Postman download all require
an authenticated tenant session. Generated files live in
`resources/developer-docs/reference/`, outside the public web directory;
the former public `/docs` addresses return 404.
