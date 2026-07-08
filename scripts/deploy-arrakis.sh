#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

hugo --gc --minify
rsync -az --delete public/ arrakis:/home/tim/5050-malaysia/

cat <<'MSG'
Deployed public/ to arrakis:/home/tim/5050-malaysia/

If this is the first deploy, add deploy/arrakis/Caddyfile.snippet to
arrakis-infra/Caddyfile, mount /home/tim/5050-malaysia as /srv/5050-malaysia
in mrx-compose.yml, then run arrakis-infra/deploy-caddy.sh --restart.
MSG

