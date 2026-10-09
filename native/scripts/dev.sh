#!/usr/bin/env bash
# Runs NEXUS with the real Chromium engine: starts the Vite dev server if it
# isn't already running, builds the native host if needed, and opens it.
# Extra arguments are passed to the native app, for example:
#   npm run nexus:dev -- --remote-debugging-port=9222
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$(cd "$ROOT/.." && pwd)"
APP="$ROOT/build/Release/NEXUS.app/Contents/MacOS/NEXUS"
URL="http://localhost:5173"

"$ROOT/scripts/build.sh"

VITE_PID=""
if ! curl --silent --output /dev/null "$URL"; then
  # NEXUS needs Firebase to sign in: your project if .env.local exists,
  # otherwise the local Firebase emulator.
  if [[ -f "$PROJECT/.env.local" ]]; then DEV_SCRIPT="dev"; else DEV_SCRIPT="dev:local"; fi
  echo "Starting NEXUS (npm run $DEV_SCRIPT)..."
  (cd "$PROJECT" && exec npm run --silent "$DEV_SCRIPT") &
  VITE_PID=$!
  for _ in $(seq 1 150); do
    curl --silent --output /dev/null "$URL" && break
    sleep 0.2
  done
fi
# Stop the dev server we started (and only that one) when NEXUS quits.
trap '[[ -n "$VITE_PID" ]] && kill "$VITE_PID" 2>/dev/null || true' EXIT

"$APP" --url="$URL" "$@"
