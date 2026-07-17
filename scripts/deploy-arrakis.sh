#!/usr/bin/env bash
# DEPRECATED. The old deploy rsynced public/ straight to Arrakis, but the site now
# rebuilds from GitHub every 5 minutes — an rsync would be overwritten by the next
# sync. Use the git-based flow instead:
#
#   ./scripts/publish.sh "your message"   # build + commit + push + rebuild + verify
#
# Forwarding to it now so nothing breaks.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "deploy-arrakis.sh is deprecated → running scripts/publish.sh instead." >&2
exec ./scripts/publish.sh "$@"
