FROM php:8.3-fpm-alpine AS base

RUN apk add --no-cache \
        bash \
        git \
        curl \
        libzip-dev \
        zip \
        unzip \
        icu-dev \
        oniguruma-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        postgresql-dev \
        $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-jpeg --with-freetype \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        pdo_pgsql \
        bcmath \
        intl \
        zip \
        gd \
        opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-supporthub.ini

# ---------------------------------------------------------------------------
# Development target: source is bind-mounted by docker-compose, dependencies
# are installed on container start via composer (see docker-compose.yml).
# ---------------------------------------------------------------------------
FROM base AS development

ENV APP_ENV=local

EXPOSE 9000

CMD ["php-fpm"]

# ---------------------------------------------------------------------------
# Production target: application code is baked into the image, dev packages excluded.
#
# Nothing environment-specific is baked in: there is no .env in the image (see
# .dockerignore) and config is cached when the container STARTS (docker/php/entrypoint.sh),
# so one image runs unchanged in any environment and secrets never end up in a layer.
# ---------------------------------------------------------------------------
FROM base AS production

ENV APP_ENV=production \
    PHP_FPM_MAX_CHILDREN=12

# Dependencies first, so this slow layer is reused when only application code changed.
COPY api/composer.json api/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --no-progress

COPY api/ /var/www/html/

RUN composer dump-autoload --no-dev --optimize --classmap-authoritative --no-interaction \
    && php artisan package:discover --ansi \
    && mkdir -p storage/app storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/php/php.production.ini /usr/local/etc/php/conf.d/zz-production.ini
COPY docker/php/php-fpm.production.conf /usr/local/etc/php-fpm.d/zz-supporthub.conf
COPY docker/php/entrypoint.sh /usr/local/bin/entrypoint

EXPOSE 9000

ENTRYPOINT ["entrypoint"]
CMD ["php-fpm"]

# ---------------------------------------------------------------------------
# API web server: nginx with public assets copied from the production image.
# Developer documentation remains in the PHP image, outside the public directory.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS api-nginx

COPY --from=production /var/www/html/public /var/www/html/public
COPY docker/nginx/api.prod.conf /etc/nginx/conf.d/default.conf
