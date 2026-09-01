#!/bin/sh
set -e

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ] && [ ! -f "database/database.sqlite" ]; then
    touch database/database.sqlite
fi

# bootstrap/cache/*.php (package discovery manifest, config/route caches) is
# excluded from the image (.dockerignore) since it's generated against
# whatever vendor/ this container actually has -- shipping the host's copy
# would reference dev-only packages (e.g. laravel/boost) that --no-dev built
# images don't install. Every container regenerates its own.
php artisan package:discover --ansi

# Only the app (php-fpm) container runs migrations, so reverb/queue containers
# starting concurrently don't race each other to migrate the same database.
if [ "${CONTAINER_ROLE:-app}" = "app" ]; then
    php artisan migrate --force
    php artisan config:cache
    php artisan route:cache
fi

exec "$@"
