#!/bin/sh
set -e

# A blank or published Reverb secret lets anyone on the LAN forge live
# updates to every screen, so refuse to start with one.
if [ -z "${REVERB_APP_SECRET:-}" ] || [ "${REVERB_APP_SECRET}" = "event-local-secret" ]; then
    echo "REVERB_APP_SECRET is blank or the published default. Run docker/setup.sh to generate unique Reverb credentials." >&2
    exit 1
fi

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
    php artisan route:cache
    php artisan view:cache
fi

# Each container has its own bootstrap/cache, so every role caches its own
# config and event listeners (the queue worker and Reverb read them too).
php artisan config:cache
php artisan event:cache

exec "$@"
