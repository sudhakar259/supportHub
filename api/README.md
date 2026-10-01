# SupportHub API

Laravel 13 REST API for SupportHub — see the [project root README](../README.md)
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

Demo login: `admin@supporthub.test` / `password` (see
[`docs/development.md`](../docs/development.md) for the full account list).

## Tests

```bash
./vendor/bin/pest
```

## API documentation

```bash
php artisan scribe:generate
```

then open `http://localhost:8000/docs` (or browse `public/docs/index.html`
directly). An OpenAPI spec and Postman collection are generated alongside
it in the same folder.
