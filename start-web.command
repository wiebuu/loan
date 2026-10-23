#!/bin/bash
# Double-click to open Loan in your Mac's browser (uses the same VPS server as your phone).
cd "$(dirname "$0")/app" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if lsof -ti tcp:8081 >/dev/null 2>&1; then
  echo "Expo is already running, opening Loan in your browser…"
  open "http://localhost:8081"
  sleep 2; exit 0
fi
[ -d node_modules ] || npm install
npx expo start --web --clear
