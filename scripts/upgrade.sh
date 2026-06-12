#!/usr/bin/env bash
# Upgrade skripта za license-server na remote serveru.
# Pokreni kao: bash scripts/upgrade.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="docker compose"

# Fallback na stariji docker-compose binarni ako compose plugin nije dostupan
if ! docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[upgrade]${NC} $*"; }
warn() { echo -e "${YELLOW}[upgrade]${NC} $*"; }
fail() { echo -e "${RED}[upgrade]${NC} $*" >&2; exit 1; }

cd "$REPO_DIR"

# ── 1. Povuci najnoviji kod ─────────────────────────────────────────────────
log "Povlačim promjene sa gita..."
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  warn "Nema novih promjena — server je već na najnovijoj verziji."
  exit 0
fi

log "Nova verzija dostupna. Updateujem..."
git pull origin main

# ── 2. Build admin panela (ako se promijenio) ───────────────────────────────
ADMIN_CHANGED=$(git diff --name-only "$LOCAL" "$REMOTE" -- admin/ | wc -l)

if [ "$ADMIN_CHANGED" -gt 0 ]; then
  log "Admin panel promijenjen — buildujem Next.js export..."
  cd "$REPO_DIR/admin"
  npm ci --prefer-offline
  npm run build
  cd "$REPO_DIR"
  log "Admin panel izbuildan u admin/out/"
else
  log "Admin panel nije promijenjen — preskačem build."
fi

# ── 3. Rebuild i restart Docker servisa ────────────────────────────────────
log "Rebuildujem API container..."
$COMPOSE build --no-cache api

log "Restartujem servise (zero-downtime rolling restart)..."
$COMPOSE up -d --no-deps api

# ── 4. Provjeri zdravlje ────────────────────────────────────────────────────
log "Čekam da API postane zdrav..."
RETRIES=20
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -eq 0 ]; then
    fail "API nije odgovorio na /health nakon 20 pokušaja. Provjeri logove: docker compose logs api"
  fi
  sleep 3
done

log "Upgrade uspješan! Verzija: $(git rev-parse --short HEAD)"
