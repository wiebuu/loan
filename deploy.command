#!/bin/bash
# Double-click to put Loan on your VPS (and again any time to update it).
#   1. saves the latest code to GitHub
#   2. the first time: copies your database and receipt photos
#   3. sends the code to the VPS and (re)starts it there with Docker
#   4. points the app at the VPS
# It logs in as wiecodes and uses sudo on the server, so it may ask for that password
# (for SSH, unless you have a key, and for sudo).
set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

VPS_IP="143.244.128.206"
VPS_USER="${VPS_USER:-wiecodes}"
VPS="$VPS_USER@$VPS_IP"
BRANCH="$(git branch --show-current)"
REPO_URL="https://github.com/wiebuu/loan.git"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ControlMaster=auto -o ControlPath=/tmp/loan-ssh-%r@%h -o ControlPersist=10m)

step() { printf '\n\033[1;32m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m%s\033[0m\n' "$*"; read -p "Press Enter to close"; exit 1; }

step "1/5  Saving the code to GitHub ($BRANCH)…"
git add -A
git commit -q -m "Update Loan" -m "Saved by deploy.command before putting it on the VPS." || true
if git push -q -u origin "$BRANCH"; then echo "Pushed."; else echo "Couldn't push to GitHub (that's OK, the code is copied straight to the VPS next)."; fi

step "2/5  Connecting to the VPS ($VPS)…"
# /opt/loan belongs to you (so copying needs no sudo); git and rsync are installed if missing.
ssh -t "${SSH_OPTS[@]}" "$VPS" 'sudo mkdir -p /opt/loan/repo /opt/loan/data/uploads && sudo chown -R "$(id -u):$(id -g)" /opt/loan/repo /opt/loan/data && (command -v git >/dev/null && command -v rsync >/dev/null || (sudo apt-get update -qq && sudo apt-get install -y -qq git rsync >/dev/null))' \
  || fail "Couldn't connect to $VPS or use sudo there. Check the password."

step "3/5  Sending the code…"
# From GitHub when the VPS can read the repo; otherwise copied straight from this Mac.
if ssh "${SSH_OPTS[@]}" "$VPS" "export GIT_TERMINAL_PROMPT=0; cd /opt/loan && if [ -d repo/.git ]; then git -C repo fetch -q origin '$BRANCH' && git -C repo checkout -q -B '$BRANCH' 'origin/$BRANCH' && git -C repo reset -q --hard 'origin/$BRANCH'; else rm -rf repo && git clone -q -b '$BRANCH' '$REPO_URL' repo; fi" 2>/dev/null; then
  echo "Pulled from GitHub."
else
  echo "Copying from this Mac instead…"
  rsync -az --delete -e "ssh ${SSH_OPTS[*]}" \
    --exclude node_modules --exclude .git --exclude .expo --exclude '*.log' --exclude 'server/uploads' --exclude 'app/.env' --exclude '.deploy' \
    ./ "$VPS:/opt/loan/repo/"
fi

if ! ssh "${SSH_OPTS[@]}" "$VPS" 'test -f /opt/loan/data/.restored'; then
  step "4/5  Copying your data (first time only)…"
  mkdir -p .deploy
  PG_MAJOR="$(psql -h localhost -d loan -tAc 'SHOW server_version_num' 2>/dev/null | cut -c1-2)"
  [ -n "$PG_MAJOR" ] || fail "Couldn't read your local database. Start it with start-server.command first."
  pg_dump -h localhost --no-owner --no-acl loan > .deploy/loan.sql
  echo "Database: $(wc -c < .deploy/loan.sql | tr -d ' ') bytes (Postgres $PG_MAJOR)"
  scp -q "${SSH_OPTS[@]}" .deploy/loan.sql "$VPS:/opt/loan/data/loan.sql"
  rsync -az -e "ssh ${SSH_OPTS[*]}" server/uploads/ "$VPS:/opt/loan/data/uploads/"
  echo "Receipt photos: $(ls server/uploads | wc -l | tr -d ' ') files"
  rm -rf .deploy
else
  step "4/5  Your data is already on the VPS, keeping it."
  PG_MAJOR=""
fi

step "5/5  Starting Loan on the VPS (the first time takes a few minutes)…"
ssh -t "${SSH_OPTS[@]}" "$VPS" "sudo PG_MAJOR='${PG_MAJOR:-16}' bash /opt/loan/repo/deploy/remote-setup.sh" || fail "Setup on the VPS failed. The messages above say why."

# Point the app at the VPS.
printf 'EXPO_PUBLIC_API_URL=http://%s:4000\n' "$VPS_IP" > app/.env
if curl -fsS --max-time 10 "http://$VPS_IP:4000/health" >/dev/null; then
  step "Done. Loan is live at http://$VPS_IP:4000"
  echo "Restart the app (close the Expo window and open start-app.command) so it uses the VPS."
else
  step "It's running on the VPS, but this Mac can't reach port 4000 on it."
  echo "Open port 4000 in your VPS provider's firewall, then try again."
fi
read -p "Press Enter to close"
