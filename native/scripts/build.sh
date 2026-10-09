#!/usr/bin/env bash
# Builds the NEXUS native host (native/build/Release/NEXUS.app).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

"$ROOT/scripts/setup-cef.sh"
cmake -G Ninja -S "$ROOT" -B "$ROOT/build" -DPROJECT_ARCH=arm64 -DCMAKE_BUILD_TYPE=Release >/dev/null
cmake --build "$ROOT/build"
echo "Built native/build/Release/NEXUS.app"
