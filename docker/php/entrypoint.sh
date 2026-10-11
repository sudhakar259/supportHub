#!/bin/sh
# Container start-up for the production image.
#
# Laravel's config/route/event caches are built HERE, when the container starts and the real
# environment (database host, keys, mail settings…) exists. Building them while the image is
# built would freeze the build machine's empty settings into the image and ignore the real
# environment at run time.
set -e

cd /var/www/html

if [ "${APP_ENV}" = "production" ]; then
    php artisan config:cache --no-interaction
    php artisan route:cache --no-interaction
    php artisan event:cache --no-interaction
fi

exec "$@"
