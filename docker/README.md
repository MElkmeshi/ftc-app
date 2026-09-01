# Running this app at an event (Docker)

For a real event on a venue LAN, don't use `composer run dev` or `php artisan
serve` (both back onto Laravel's single-threaded dev server) or Herd (its
nginx only binds `127.0.0.1`, unreachable from other devices). This Docker
Compose stack runs a real nginx + php-fpm server plus Reverb, bound to all
interfaces, over plain HTTP -- there's no TLS to fight because a closed venue
LAN isn't the public internet, and Reverb's own TLS support was unreliable
against real browsers anyway (see git log).

## First-time setup

```
./docker/setup.sh
```

This generates `.env.docker` (with a random `APP_KEY`) if it doesn't exist,
builds the frontend with `vite build --mode docker`, and brings the stack up.

## Every event after that

```
docker compose up -d --build
```

(Re-run `npx vite build --mode docker` first if you changed any frontend code
since the last event.)

## Connecting

- On this machine: `http://localhost:8090`
- From any other device on the same LAN (referee tablets, scoreboards):
  `http://<this-machine's-LAN-IP>:8090` -- `docker/setup.sh` prints this IP
  for you, or find it yourself (macOS: `ipconfig getifaddr en0`).

You do **not** need to rebuild assets when you're on a different LAN at a
different venue -- `app.tsx` derives the WebSocket host from
`window.location.hostname` at runtime, so whatever IP a device typed into its
browser is what it connects Reverb to as well.

## What's running

| Service  | Purpose                                  | Host port |
|----------|-------------------------------------------|-----------|
| `nginx`  | Web server, serves `public/`              | 8090      |
| `app`    | PHP-FPM, runs migrations on boot          | (internal)|
| `reverb` | WebSocket server (match sync)             | 8081      |
| `queue`  | Background job worker                     | (internal)|

All four share the same SQLite database (bind-mounted from `./database`), so
match/team/score data persists across `docker compose down` / `up`.

## Stopping

```
docker compose down
```

Data in `./database` and `./storage` isn't touched by this -- only the
containers are removed.

## Changing the shared secrets

`.env.docker`'s `REVERB_APP_KEY`/`REVERB_APP_SECRET`/`REVERB_APP_ID` are
placeholder values from the example file. They only need to be *some* random
string, not memorable -- change them once and forget them.
