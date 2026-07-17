#!/usr/bin/env bash
# Local live preview with drafts + fast rebuilds. Ctrl-C to stop.
# Usage: ./scripts/preview.sh
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=scripts/config.sh
source scripts/config.sh

echo "Preview → http://127.0.0.1:${PREVIEW_PORT}/   (Ctrl-C to stop)"
exec hugo server --bind 127.0.0.1 --port "$PREVIEW_PORT" --buildDrafts --navigateToChanged
