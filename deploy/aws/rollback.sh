#!/usr/bin/env bash
# Switches the API back to an image that is already on this server (no rebuild).
#
#   sudo ./rollback.sh 3f9a1c2        # a tag from /opt/supporthub/deploys.log
#
# This does NOT undo database migrations. Release migrations so the previous version still
# works with the new schema (add columns, don't drop or rename them in the same release).
set -euo pipefail

TAG="${1:?Usage: rollback.sh <image-tag>  (see /opt/supporthub/deploys.log)}"
APP_DIR="${APP_DIR:-/opt/supporthub}"
export ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
export IMAGE_TAG="$TAG"

for image in "supporthub-api:$TAG" "supporthub-nginx:$TAG"; do
    docker image inspect "$image" >/dev/null 2>&1 || { echo "Image $image is not on this server. Use deploy-api.sh $TAG to rebuild it." >&2; exit 1; }
done

docker compose --env-file "$ENV_FILE" -f "$APP_DIR/app/docker-compose.prod.yml" up -d --no-build --remove-orphans
docker compose --env-file "$ENV_FILE" -f "$APP_DIR/app/docker-compose.prod.yml" exec -T app php artisan queue:restart
echo "Rolled back to $TAG"
