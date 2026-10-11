#!/usr/bin/env bash
# Run ONCE after the very first deploy: loads the reference data the product needs and creates
# the first platform administrator. It deliberately does NOT run the demo seeders (they create
# accounts with well-known passwords).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/supporthub}"
export ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
compose() { docker compose --env-file "$ENV_FILE" -f "$APP_DIR/app/docker-compose.prod.yml" "$@"; }

echo "==> Loading roles, plans, email templates and default settings"
for seeder in RolesAndPermissionsSeeder MembershipPlanSeeder NotificationTemplateSeeder SystemSettingSeeder; do
    compose exec -T app php artisan db:seed --class="$seeder" --force
done

read -r -p "Email address for the platform administrator: " ADMIN_EMAIL
read -r -p "Display name: " ADMIN_NAME
# Not -T: the command asks for the password on the terminal and hides what you type.
compose exec app php artisan supporthub:create-platform-admin "$ADMIN_EMAIL" --name="$ADMIN_NAME"

echo "==> Checking the configuration"
compose exec -T app php artisan supporthub:preflight --production || true
