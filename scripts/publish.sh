#!/usr/bin/env bash
# One command to ship a change: build, commit, push, trigger the Arrakis rebuild,
# and verify the live site.
#
# Usage:
#   ./scripts/publish.sh "commit message"
#   ./scripts/publish.sh                     # uses a default message
#
# The site's own /admin/ editor also commits to this repo, so this script rebases
# on the remote before pushing to avoid clobbering profile edits made there.
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=scripts/config.sh
source scripts/config.sh

msg="${1:-content update}"

echo "▸ Building (catches template/content errors before pushing)…"
hugo --gc --minify >/dev/null

echo "▸ Committing…"
git add -A
if git diff --cached --quiet; then
  echo "  nothing to commit — re-syncing current main."
else
  git commit -q -m "$msg"
  git --no-pager log --oneline -1 | sed 's/^/  /'
fi

echo "▸ Syncing with remote (rebase over any /admin/ editor commits)…"
git pull --rebase --autostash origin main >/dev/null

echo "▸ Pushing to GitHub…"
git push origin main >/dev/null

echo "▸ Triggering Arrakis rebuild…"
ssh -o ConnectTimeout=10 "$ARRAKIS_SSH" \
  "sudo systemctl start ${SYNC_SERVICE} && sleep 6 && journalctl -u ${SYNC_SERVICE} -n 1 --no-pager -o cat" \
  | sed 's/^/  /'

echo "▸ Verifying live…"
./scripts/verify-live.sh

echo
echo "Done → https://${DOMAIN}/"
