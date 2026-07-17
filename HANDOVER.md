# HANDOVER - 5050-malaysia

**2026-07-17 23:07 WIB (Asia/Jakarta).** Mission: 50-50 Malaysia is **live** on Arrakis at
`https://5050malaysia.com` — the WordPress→Hugo migration and DNS cutover are done. This
session verified the cutover, added a dark/light theme toggle, removed the old GitHub
(Decap) admin login, and built a one-command edit/deploy workflow. Remaining work is
content/ops polish, not launch-blocking.

## RUNNING RIGHT NOW

- **Arrakis editor:** `5050-malaysia-editor.service` active on `168.144.107.250`, bound to
  `0.0.0.0:8797` for the Docker bridge. Check:
  `ssh tim@168.144.107.250 'systemctl status 5050-malaysia-editor.service'`.
- **Automatic Hugo sync:** `5050-malaysia-hugo-sync.timer` active, runs every 5 min; pulls
  `/home/tim/5050-malaysia-src` from GitHub and rebuilds `/home/tim/5050-malaysia/`. Check:
  `ssh tim@168.144.107.250 'systemctl list-timers 5050-malaysia-hugo-sync.timer'`.
  The oneshot service `5050-malaysia-hugo-sync.service` can be triggered on demand (this is
  what `make sync` / `scripts/publish.sh` do).
- **Caddy:** `mrx-caddy` serves `5050malaysia.com` + `www` with a Basic-Auth `/admin/` route
  (username **admin**, bcrypt hash in `arrakis-infra/Caddyfile`) reverse-proxying to the
  editor. Valid Let's Encrypt cert. A temporary `http://168.144.107.250` test route still
  exists and can now be removed (see NEXT STEPS 1).
- **No local watchers/servers left running.** The local Hugo preview (`make preview`, port
  1319 during testing) was stopped. Nothing local survives this session.

## NEXT STEPS

1. **[pending — now unblocked]** Remove the temporary `http://168.144.107.250` block from
   `arrakis-infra/Caddyfile` (lines ~98-110) and redeploy Caddy. DNS is verified, so the raw
   IP route is no longer needed. Keep the Basic-Auth route on the domain.
2. **[pending]** Rotate/store the editor Basic-Auth password in 1Password. Plaintext is not
   in git; only the bcrypt hash is in the Caddyfile. The WhatsApp login message drafted for
   Tashny leaves a placeholder for it — send the password separately.
3. **[pending — Tashny]** Have Tashny log in at `https://5050malaysia.com/admin/`
   (username + password, not GitHub), edit one profile, save, and confirm it goes live
   within ~5 min. Footer now has an "Editor login" link to `/admin/`.
4. **[pending]** Content placeholders before wider promotion: replace the placeholder Google
   Form URL (`site.Params.signupFormURL`), confirm `site.Params.contactEmail`
   (`fiftyfiftymalaysia@gmail.com`), add the final logo pack, obtain GA4 access (tracker #3).
5. **[pending decision]** Cynet hosting renewal RM150.12 due **2026-07-24**. DNS is fully on
   Arrakis now, so the old host is likely droppable — decide renew vs cancel.

## KEY RESULTS

- **DNS cutover complete and verified.** Nameservers are the Arrakis Cloudflare zone
  (`denver.ns.cloudflare.com` / `sneh.ns.cloudflare.com`); apex + `www` resolve to
  `168.144.107.250`. Authoritative NS and public resolvers (1.1.1.1, 8.8.8.8, 9.9.9.9) all
  return the Arrakis IP. HTTPS 200, HTTP→HTTPS 308, `/admin/` 401 unauthenticated, valid
  Let's Encrypt cert (issued 2026-07-17, expires 2026-10-15).
- **Dark/light toggle live.** Sun/moon button in the nav, persisted in `localStorage`, with
  a no-flash `<head>` script that stamps `data-theme` before paint (OS preference as
  default). Dark styling is keyed to `data-theme` so the manual toggle also swaps the logo
  (`logo-inverse.svg`), join button, and notice; an OS-preference `@media` block is the
  no-JS fallback. Nav made to wrap gracefully — no clipping, verified down to 920px.
- **GitHub login removed.** Deleted the retired `static/admin/` Decap loader
  (`index.html` + `config.yml`) that showed a GitHub OAuth login in local preview.
  Production `/admin/` is username+password Basic Auth → password editor
  (`WWW-Authenticate: Basic realm="restricted"` confirmed live).
- **One-command deploy workflow added.** `make publish m="..."` builds → commits →
  `pull --rebase` (over `/admin/` editor commits) → pushes → triggers the Arrakis rebuild →
  verifies live against the origin IP. Hugo build passes with 274 pages / 235 profiles /
  33 industries.
- Session commits: `4366a31`, `07e369f`, `038e690`, `ec44c6f`, `2c47370` (tip). Working tree
  clean.

## GOTCHAS

- **Stale local DNS shows the OLD WordPress site.** This Mac (and some ISP caches) still
  hold the *old* Cloudflare zone's proxied IPs (`104.21.x` / `172.67.x`) which route to the
  dead WordPress origin. Real visitors on updated resolvers get the new site. Verify by
  hitting the origin directly (`curl --resolve 5050malaysia.com:443:168.144.107.250 ...`) —
  `scripts/verify-live.sh` / `make verify` does this and warns if your resolver is stale.
  Flush with `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`.
- **The `/admin/` editor also commits to this repo.** Local `main` can fall behind. Always
  `pull --rebase` before pushing — `scripts/publish.sh` does this automatically.
- **`make publish m="..."` needs a single-line message** (a `make` limitation). For a
  multi-line commit body, call `./scripts/publish.sh "line1<newline>line2"` directly.
- **Tailscale `arrakis` SSH alias (`100.102.100.43`) was down this session** — scripts
  default to the public `tim@168.144.107.250`. When Tailscale is up, use
  `ARRAKIS_SSH=arrakis make publish m="..."`. Passwordless sudo works for the sync service.
- **`public/admin/` may linger as a stale local build artifact** — Hugo doesn't prune
  orphaned files from `public/` (which is gitignored). Harmless: Arrakis rebuilds fresh and
  Caddy intercepts `/admin/` regardless.
- Editor uses port **8797** (8796 is the unrelated Bifrost webhook). Caddy runs in Docker, so
  the editor binds `0.0.0.0`; firewall allows 8797 only from the Docker bridge.
- Do not rerun `scripts/import_hugo_content.py --force` after editor changes unless you
  intend to overwrite content from the old scraped JSON.
- `arrakis-infra` worktree may carry unrelated dirty changes (Caddyfile, `hermes/`) —
  preserve them; don't reset or clean.

## OPEN ITEMS (blocked on humans)

- Editor Basic-Auth password → store/rotate in 1Password; send to Tashny separately (not in
  git or this file).
- Tashny's login + profile-edit test through `https://5050malaysia.com/admin/`.
- Real Google Form URL + owner, GA4 property access, final designer logo files, and
  `fiftyfiftymalaysia@gmail.com` inbox access if needed.
- Cynet hosting renewal decision (RM150.12 due 2026-07-24).

## FILE MAP

Modified/created this session (local):
- `HANDOVER.md` - this state.
- `README.md` - added the `make`-based edit/deploy workflow section.
- `Makefile` - task front door (`preview`, `build`, `publish`, `verify`, `sync`).
- `scripts/publish.sh` - build+commit+rebase+push+rebuild+verify (the one-command deploy).
- `scripts/preview.sh` - local `hugo server` preview.
- `scripts/verify-live.sh` - checks the live site via the origin IP (ignores stale DNS).
- `scripts/config.sh` - shared settings (domain, Arrakis IP/SSH, sync service, port).
- `scripts/deploy-arrakis.sh` - deprecated rsync deploy; now forwards to `publish.sh`.
- `layouts/_default/baseof.html` - no-flash theme script.
- `layouts/partials/nav.html` - theme toggle button.
- `layouts/partials/footer.html` - "Editor login" link to `/admin/`.
- `static/assets/site.css` - dark/light theming, toggle styles, non-clipping nav.
- `static/admin/index.html`, `static/admin/config.yml` - **deleted** (retired Decap loader).
- `.gitignore` - ignore `.playwright-mcp/` browser artifacts.

Standing docs / infra (unchanged this session):
- `ADMIN-GUIDE.md` - nontechnical editor instructions.
- `DEPLOY-HUGO.md` - Hugo/Arrakis deploy runbook.
- `deploy/arrakis/5050-editor-server.js` - password-protected editor service.
- Arrakis: `arrakis-infra/nixos/configuration.nix` (services/timer/firewall),
  `arrakis-infra/Caddyfile` (domain route + temporary IP test route).
- Remote source `/home/tim/5050-malaysia-src`; served output `/home/tim/5050-malaysia`;
  deploy key `/home/tim/.ssh/5050-malaysia-deploy` (secret; not in git).
