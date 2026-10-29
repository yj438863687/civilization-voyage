#!/usr/bin/env bash
# Start the basic local app: API + web. No secrets required.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_PORT="${VOYAGE_API_PORT:-8010}"
export VITE_API_BASE="${VITE_API_BASE:-http://127.0.0.1:${API_PORT}}"

cd "$ROOT/apps/api"
if [[ ! -x .venv/bin/uvicorn ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi
export VOYAGE_DB="${VOYAGE_DB:-$ROOT/apps/api/voyage.sqlite3}"
.venv/bin/uvicorn voyage.main:app --host 127.0.0.1 --port "$API_PORT" &
API_PID=$!
cleanup() { kill "$API_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

cd "$ROOT/apps/web"
if [[ ! -d node_modules ]]; then
  npm install
fi
echo "API $VITE_API_BASE  web http://127.0.0.1:5173"
npx vite --host 127.0.0.1 --port 5173
