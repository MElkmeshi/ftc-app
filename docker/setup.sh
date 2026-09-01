#!/bin/sh
# One-command setup for running this app at an event: builds the frontend,
# provisions .env.docker (with a generated APP_KEY) if it doesn't exist yet,
# and brings the whole stack up.
set -e
cd "$(dirname "$0")/.."

if [ ! -f .env.docker ]; then
    cp .env.docker.example .env.docker
    KEY=$(php -r "echo 'base64:'.base64_encode(random_bytes(32));")
    # Portable in-place sed (BSD/macOS and GNU differ on -i syntax).
    sed -i.bak "s#^APP_KEY=.*#APP_KEY=${KEY}#" .env.docker && rm -f .env.docker.bak
    echo "Created .env.docker with a generated APP_KEY."
fi

echo "Building frontend assets (--mode docker, so Vite picks up .env.docker)..."
npx vite build --mode docker

echo "Starting the stack (nginx :8090, reverb :8081)..."
docker compose up -d --build

echo
echo "Ready. On this machine:   http://localhost:8090"
echo "From other devices on the LAN, use this machine's IP instead of localhost, e.g.:"
echo "  http://$(ipconfig getifaddr en0 2>/dev/null || echo '<your-lan-ip>'):8090"
