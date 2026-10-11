#!/usr/bin/env bash
# Builds the web app and publishes it to S3 + CloudFront. Run from your laptop or CI, NOT the server.
#
#   WEB_BUCKET=supporthub-web-prod \
#   CLOUDFRONT_DISTRIBUTION_ID=E123ABC456 \
#   VITE_API_URL=https://api.example.com/api/v1 \
#   VITE_WORKSPACE_DOMAIN=example.com \
#   VITE_SUPPORT_EMAIL=support@example.com \
#   VITE_LEGAL_ENTITY="Example Ltd." \
#   ./deploy-web.sh
#
# The address values are compiled into the files, so changing one means running this again.
set -euo pipefail

: "${WEB_BUCKET:?Set WEB_BUCKET (the S3 bucket that holds the site)}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"
: "${VITE_API_URL:?Set VITE_API_URL, e.g. https://api.example.com/api/v1}"
: "${VITE_WORKSPACE_DOMAIN:?Set VITE_WORKSPACE_DOMAIN, e.g. example.com (must match WORKSPACE_DOMAIN on the API)}"

case "$VITE_API_URL" in https://*) ;; *) echo "VITE_API_URL must be an https:// address" >&2; exit 1 ;; esac
case "$VITE_API_URL" in *localhost*|*127.0.0.1*) echo "VITE_API_URL points at localhost" >&2; exit 1 ;; esac

cd "$(dirname "$0")/../../web"

npm ci
npm run build

# Hashed files in assets/ never change under the same name: cache them for a year.
aws s3 sync dist/assets "s3://$WEB_BUCKET/assets" \
    --cache-control "public,max-age=31536000,immutable"

# Everything else (icons, robots.txt…) can change under the same name: cache briefly.
aws s3 sync dist "s3://$WEB_BUCKET" \
    --exclude "assets/*" --exclude "index.html" \
    --cache-control "public,max-age=3600"

# index.html goes up LAST and is never cached, so a visitor never gets a page that points at
# files that are not uploaded yet. Old hashed files stay for visitors still on the previous page.
aws s3 cp dist/index.html "s3://$WEB_BUCKET/index.html" \
    --cache-control "no-cache" --content-type "text/html; charset=utf-8"

aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/index.html" "/" >/dev/null

echo "Published. Old files in s3://$WEB_BUCKET/assets can be pruned occasionally (anything older than a month)."
