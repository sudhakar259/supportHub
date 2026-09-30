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
# Production target: application code is baked into the image and
# dependencies are installed with dev packages excluded.
# ---------------------------------------------------------------------------
FROM base AS production

ENV APP_ENV=production

COPY api/ /var/www/html/

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan event:cache \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
