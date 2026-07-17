#!/usr/bin/env bash
# Verify the live site on Arrakis, hitting the origin IP directly so a stale
# local/ISP DNS cache can't show you the old WordPress site by mistake.
#
# Usage: ./scripts/verify-live.sh
# Exit code is non-zero if any check fails.
set -uo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=scripts/config.sh
source scripts/config.sh

fail=0
resolve="${DOMAIN}:443:${ARRAKIS_IP}"

check() { # <label> <expected-code> <path> [grep-marker]
  local label="$1" want="$2" path="$3" marker="${4:-}"
  local body code
  body="$(curl -sS --resolve "$resolve" "https://${DOMAIN}${path}" -w $'\n%{http_code}' 2>/dev/null)"
  code="${body##*$'\n'}"
  body="${body%$'\n'*}"
  if [ "$code" != "$want" ]; then
    printf '  ✗ %-22s %s (got HTTP %s, wanted %s)\n' "$label" "$path" "$code" "$want"; fail=1; return
  fi
  if [ -n "$marker" ] && ! printf '%s' "$body" | grep -q "$marker"; then
    printf '  ✗ %-22s %s (HTTP %s but missing "%s")\n' "$label" "$path" "$code" "$marker"; fail=1; return
  fi
  printf '  ✓ %-22s %s (HTTP %s)\n' "$label" "$path" "$code"
}

echo "Checking https://${DOMAIN}  (origin ${ARRAKIS_IP})"
check "homepage"    200 "/"             "A directory of women experts"
check "profiles"    200 "/profiles/"
check "industries"  200 "/industries/"
check "admin (auth)" 401 "/admin/"

# Warn if this machine's resolver disagrees with the authoritative zone — that is
# the "I still see WordPress locally" trap. Not a failure, just a heads-up.
sys="$(dig +short A "$DOMAIN" | tr '\n' ' ')"
if ! printf '%s' "$sys" | grep -q "$ARRAKIS_IP"; then
  echo
  echo "  ⚠ Your machine resolves ${DOMAIN} to: ${sys:-<none>}"
  echo "    (authoritative is ${ARRAKIS_IP}). Local DNS cache is stale — flush with:"
  echo "    sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder"
fi

echo
if [ "$fail" -eq 0 ]; then echo "All checks passed."; else echo "Some checks FAILED."; fi
exit "$fail"
