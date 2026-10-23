#!/bin/bash
# Double-click to start the Loan API (port 4000).
cd "$(dirname "$0")/server" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

if ! command -v pg_isready >/dev/null; then
  echo "PostgreSQL isn't installed. Install it with: brew install postgresql@16  (or Postgres.app)"; read -p "Press Enter to close"; exit 1
fi
if ! pg_isready -q -h localhost; then
  echo "Starting PostgreSQL..."
  if command -v brew >/dev/null && brew services list 2>/dev/null | grep -q '^postgresql'; then
    brew services start "$(brew services list | awk '/^postgresql/{print $1; exit}')"
  elif [ -d /Applications/Postgres.app ]; then
    open -a Postgres
  fi
  for i in $(seq 1 20); do pg_isready -q -h localhost && break; sleep 1; done
fi
pg_isready -h localhost || { echo "PostgreSQL is not running."; read -p "Press Enter to close"; exit 1; }

psql -h localhost -lqt | cut -d'|' -f1 | grep -qw loan || createdb -h localhost loan
[ -f .env ] || cp .env.example .env
[ -d node_modules ] || npm install
npm run seed
npm run dev
