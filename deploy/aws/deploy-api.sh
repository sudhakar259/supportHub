#!/usr/bin/env bash
# Deploys the API to this server: pull code, build images, migrate, restart, verify.
#
#   sudo ./deploy-api.sh            # deploy the latest of the current branch
#   sudo ./deploy-api.sh v1.0.3     # deploy a specific tag or commit
#   STRICT_PREFLIGHT=1 sudo -E ./deploy-api.sh   # fail the deploy if the config check fails
#
# Rolling back: run it again with the previous tag, or use rollback.sh for the fast path.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/supporthub}"
REPO="$APP_DIR/app"
export ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"

cd "$REPO"

git fetch --quiet origin
if [ -n "${1:-}" ]; then
    git checkout --quiet "$1"
else
    git pull --quiet --ff-only
fi

IMAGE_TAG="$(git rev-parse --short HEAD)"
export IMAGE_TAG
echo "==> Deploying $IMAGE_TAG"

"$REPO/deploy/aws/fetch-env.sh"

compose() { docker compose --env-file "$ENV_FILE" -f "$REPO/docker-compose.prod.yml" "$@"; }

echo "==> Building images"
compose build

# Migrate with the NEW code before it serves traffic, so a failed migration stops the deploy
# while the old version is still running. Migrations must therefore stay backward compatible
# with the previous release for the minute between this step and the restart.
echo "==> Migrating the database"
compose run --rm --no-deps app php artisan migrate --force

echo "==> Starting"
compose up -d --remove-orphans
compose exec -T app php artisan queue:restart

echo "==> Waiting for the health check"
healthy=0
for _ in $(seq 1 30); do
    if curl -fsS http://localhost/up >/dev/null 2>&1; then healthy=1; break; fi
    sleep 2
done
if [ "$healthy" -ne 1 ]; then
    echo "!! The API did not become healthy. Recent logs:" >&2
    compose logs --tail 60 app nginx >&2
    echo "!! The previous version is still on this server as an image: run rollback.sh <previous-tag> (tags are in $APP_DIR/deploys.log)." >&2
    exit 1
fi

echo "==> Checking the configuration"
if ! compose exec -T app php artisan desknu:preflight --production; then
    echo "!! The configuration check reported problems (above)." >&2
    [ "${STRICT_PREFLIGHT:-0}" = "1" ] && exit 1
fi

echo "$(date -u +%FT%TZ) $IMAGE_TAG" >> "$APP_DIR/deploys.log"
# Keep a week of old images so a rollback is instant; drop the rest.
docker image prune -f --filter "until=168h" >/dev/null
echo "==> Done: $IMAGE_TAG is live. Previous deploys:"
tail -n 5 "$APP_DIR/deploys.log"
