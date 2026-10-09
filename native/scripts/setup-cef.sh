#!/usr/bin/env bash
# Downloads the prebuilt CEF binary distribution that the NEXUS native host
# links against, and unpacks it to native/third_party/cef. Safe to re-run: it
# does nothing once CEF is in place.
#
# This is the compiled engine. The CEF *source* checkout in chromium/cef is
# not used by the build (see docs/BROWSER_ENGINE.md).
set -euo pipefail

CEF_VERSION="154.0.34+g14c5a08+chromium-154.0.8037.98"
CEF_PLATFORM="macosarm64"
CEF_SHA1="b7081f6609e5edccf07be96b5d7977329fbe1bdf"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/third_party/cef"
NAME="cef_binary_${CEF_VERSION}_${CEF_PLATFORM}_minimal"
ARCHIVE="$ROOT/third_party/$NAME.tar.bz2"
# "+" must be percent-encoded in the download URL.
URL="https://cef-builds.spotifycdn.com/${NAME//+/%2B}.tar.bz2"

if [[ "$(uname -s)-$(uname -m)" != "Darwin-arm64" ]]; then
  echo "This script fetches the macOS Apple Silicon build of CEF. Other platforms need their own build." >&2
  exit 1
fi

if [[ -f "$DEST/cmake/FindCEF.cmake" ]]; then
  echo "CEF $CEF_VERSION is already set up in native/third_party/cef."
  exit 0
fi

for tool in cmake ninja; do
  command -v "$tool" >/dev/null || { echo "Missing $tool. Install it with: brew install cmake ninja" >&2; exit 1; }
done

mkdir -p "$ROOT/third_party"
if [[ ! -f "$ARCHIVE" ]]; then
  echo "Downloading CEF $CEF_VERSION (about 130 MB)..."
  curl --fail --location --progress-bar -o "$ARCHIVE.part" "$URL"
  mv "$ARCHIVE.part" "$ARCHIVE"
fi

echo "Verifying download..."
ACTUAL="$(shasum -a 1 "$ARCHIVE" | cut -d' ' -f1)"
if [[ "$ACTUAL" != "$CEF_SHA1" ]]; then
  echo "Checksum mismatch: expected $CEF_SHA1, got $ACTUAL. Delete $ARCHIVE and try again." >&2
  exit 1
fi

echo "Unpacking..."
rm -rf "$DEST" "$ROOT/third_party/$NAME"
tar -xjf "$ARCHIVE" -C "$ROOT/third_party"
mv "$ROOT/third_party/$NAME" "$DEST"
rm "$ARCHIVE"
echo "CEF is ready in native/third_party/cef."
