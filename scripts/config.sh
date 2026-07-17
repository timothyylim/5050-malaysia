# Shared configuration for the 50-50 Malaysia helper scripts.
# Sourced by the other scripts in this directory; not meant to run on its own.

# Public site.
DOMAIN="5050malaysia.com"

# Arrakis host that serves the site and runs the Hugo sync timer.
# ARRAKIS_IP is used to hit the origin directly (bypasses local/ISP DNS cache).
# ARRAKIS_SSH is the SSH target; override with the Tailscale `arrakis` alias when
# Tailscale is up:  ARRAKIS_SSH=arrakis ./scripts/publish.sh "..."
ARRAKIS_IP="168.144.107.250"
ARRAKIS_SSH="${ARRAKIS_SSH:-tim@${ARRAKIS_IP}}"

# The oneshot service that pulls this repo from GitHub and rebuilds the site.
SYNC_SERVICE="5050-malaysia-hugo-sync.service"

# Local preview.
PREVIEW_PORT="${PREVIEW_PORT:-1313}"
