#!/usr/bin/env bash
# Runs ON THE VPS as root (deploy.command on your Mac starts it over SSH with sudo).
# Installs Docker if needed, restores your data the first time, then (re)starts Loan.
set -euo pipefail

ROOT=/opt/loan
REPO=$ROOT/repo
DATA=$ROOT/data
PG_MAJOR=${PG_MAJOR:-16}
cd "$REPO"

say() { printf '\n\033[1;32m▸ %s\033[0m\n' "$*"; }

if ! command -v docker >/dev/null 2>&1; then
  say "Installing Docker (first time only)…"
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p "$DATA/uploads" "$DATA/downloads"
if [ ! -f "$ROOT/.env" ]; then
  say "Creating settings with a new database password…"
  printf 'POSTGRES_PASSWORD=%s\nPG_MAJOR=%s\nPORT=4000\n' "$(openssl rand -hex 16)" "$PG_MAJOR" > "$ROOT/.env"
  chmod 600 "$ROOT/.env"
fi
# Docker Compose: the plugin ("docker compose") or the older "docker-compose" command.
if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  say "Installing Docker Compose (first time only)…"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq >/dev/null 2>&1 || true
    apt-get install -y -qq docker-compose-plugin >/dev/null 2>&1 \
      || apt-get install -y -qq docker-compose-v2 >/dev/null 2>&1 || true
  fi
  if ! docker compose version >/dev/null 2>&1; then
    ARCH=$(uname -m); [ "$ARCH" = "arm64" ] && ARCH=aarch64
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -fsSL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-$ARCH" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  fi
fi
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose --env-file "$ROOT/.env" -p loan)
else
  DC=(docker-compose --env-file "$ROOT/.env" -p loan)
fi
"${DC[@]}" version >/dev/null 2>&1 || { echo "Docker Compose couldn't be set up."; exit 1; }

say "Starting the database…"
"${DC[@]}" up -d db
for i in $(seq 1 60); do
  "${DC[@]}" exec -T db pg_isready -U loan -d loan >/dev/null 2>&1 && break
  sleep 2
done

# Copy your Mac's data in once, while the database is still empty.
if [ -f "$DATA/loan.sql" ] && [ ! -f "$DATA/.restored" ]; then
  TABLES=$("${DC[@]}" exec -T db psql -U loan -d loan -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
  if [ "$TABLES" = "0" ]; then
    say "Copying your data into the database…"
    "${DC[@]}" exec -T db psql -q -U loan -d loan -v ON_ERROR_STOP=0 < "$DATA/loan.sql" >/dev/null
  else
    say "The database already has data, so your Mac's copy was not loaded again."
  fi
  touch "$DATA/.restored"
fi

say "Building and starting the API…"
"${DC[@]}" up -d --build api

# The demo users (@rahul, @priya, @aman) are added if they're missing.
"${DC[@]}" exec -T api npx tsx src/seed.ts >/dev/null 2>&1 || true

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 4000/tcp >/dev/null
fi

say "Checking it's up…"
for i in $(seq 1 40); do
  if curl -fsS http://localhost:4000/health >/dev/null 2>&1; then
    echo "Loan API is running on port 4000."
    exit 0
  fi
  sleep 2
done
echo "The API did not answer. Last lines of its log:"
"${DC[@]}" logs --tail 40 api
exit 1
