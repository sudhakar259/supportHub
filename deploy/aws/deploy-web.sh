#!/usr/bin/env bash
# Builds the web app and publishes it to S3 + CloudFront. Run from your laptop or CI, NOT the server.
#
#   WEB_BUCKET=supporthub-web-prod \
#   CLOUDFRONT_DISTRIBUTION_ID=E123ABC456 \
#   CLOUDFRONT_FUNCTION_NAME=supporthub-routing \
#   VITE_API_URL=https://api.example.com/api/v1 \
#   VITE_WORKSPACE_DOMAIN=example.com \
#   VITE_SUPPORT_EMAIL=support@example.com \
#   VITE_LEGAL_ENTITY="Example Ltd." \
#   ./deploy-web.sh
#
# Optional error tracking: VITE_SENTRY_DSN (a Sentry "React" project key). See docs/error-tracking.md.
# VITE_RELEASE defaults to the git commit, so each error report says which deploy it came from.
#
# VITE_SITE_URL (the public website's address, e.g. https://example.com) defaults to
# https://$VITE_WORKSPACE_DOMAIN. All address values are compiled into the files, so changing one
# means running this again.
#
# The build produces: marketing pages as static HTML (one folder per page), app.html (the shell for
# sign-in and the workspace), robots.txt / tenant-robots.txt, sitemap.xml, and
# hosting/cloudfront-routing.js, a CloudFront Function that sends each address to the right file.
# See docs/branding-seo.md. That function lists the public pages, so it must be updated whenever
# they change: this script does it when CLOUDFRONT_FUNCTION_NAME is set.
set -euo pipefail

: "${WEB_BUCKET:?Set WEB_BUCKET (the S3 bucket that holds the site)}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"
: "${VITE_API_URL:?Set VITE_API_URL, e.g. https://api.example.com/api/v1}"
: "${VITE_WORKSPACE_DOMAIN:?Set VITE_WORKSPACE_DOMAIN, e.g. example.com (must match WORKSPACE_DOMAIN on the API)}"
export VITE_SITE_URL="${VITE_SITE_URL:-https://$VITE_WORKSPACE_DOMAIN}"
export VITE_RELEASE="${VITE_RELEASE:-$(git rev-parse --short HEAD 2>/dev/null || echo unknown)}"

case "$VITE_API_URL" in https://*) ;; *) echo "VITE_API_URL must be an https:// address" >&2; exit 1 ;; esac
case "$VITE_API_URL" in *localhost*|*127.0.0.1*) echo "VITE_API_URL points at localhost" >&2; exit 1 ;; esac
case "$VITE_SITE_URL" in https://*) ;; *) echo "VITE_SITE_URL must be an https:// address" >&2; exit 1 ;; esac

cd "$(dirname "$0")/../../web"

npm ci
npm run build        # type-check, bundle, then prerender the public pages
npm run test:seo     # fails if a public page lost its canonical/sitemap entry, or a private one became indexable

# Hashed files in assets/ never change under the same name: cache them for a year.
aws s3 sync dist/assets "s3://$WEB_BUCKET/assets" \
    --cache-control "public,max-age=31536000,immutable"

# Everything else that is not a page (icons, fonts, robots, sitemap…) can change under the same name:
# cache briefly. hosting/ is for CloudFront's configuration, not for visitors, so it is not uploaded.
aws s3 sync dist "s3://$WEB_BUCKET" \
    --exclude "assets/*" --exclude "*.html" --exclude "hosting/*" --exclude "public-routes.json" \
    --cache-control "public,max-age=3600"

# Pages go up LAST and are never cached, so a visitor never gets a page that points at files that are
# not uploaded yet. Old hashed files stay for visitors still on the previous page.
aws s3 sync dist "s3://$WEB_BUCKET" \
    --exclude "*" --include "*.html" \
    --cache-control "no-cache" --content-type "text/html; charset=utf-8"

# The routing function embeds the list of public pages, so publish the new one before invalidating.
if [ -n "${CLOUDFRONT_FUNCTION_NAME:-}" ]; then
    ETAG="$(aws cloudfront describe-function --name "$CLOUDFRONT_FUNCTION_NAME" --query ETag --output text)"
    CONFIG="$(aws cloudfront describe-function --name "$CLOUDFRONT_FUNCTION_NAME" --query FunctionSummary.FunctionConfig --output json)"
    NEW_ETAG="$(aws cloudfront update-function --name "$CLOUDFRONT_FUNCTION_NAME" --if-match "$ETAG" \
        --function-config "$CONFIG" --function-code fileb://dist/hosting/cloudfront-routing.js --query ETag --output text)"
    aws cloudfront publish-function --name "$CLOUDFRONT_FUNCTION_NAME" --if-match "$NEW_ETAG" >/dev/null
    echo "Routing function $CLOUDFRONT_FUNCTION_NAME updated and published."
else
    echo "!! CLOUDFRONT_FUNCTION_NAME is not set: copy web/dist/hosting/cloudfront-routing.js into your CloudFront Function by hand" >&2
    echo "!! (a changed list of public pages is otherwise served from the private-app fallback)." >&2
fi

aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/*" >/dev/null

echo "Published. Old files in s3://$WEB_BUCKET/assets can be pruned occasionally (anything older than a month)."
