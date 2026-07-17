# HANDOVER - 5050-malaysia

**2026-07-17 12:45 WIB (Asia/Jakarta).** Mission: migrate 50-50 Malaysia from WordPress
to the Hugo static directory and provide Tashny with a simple password-protected editor
hosted on Arrakis. The editor is deployed and ready for testing before DNS cutover.

## RUNNING RIGHT NOW

- **Arrakis editor:** `5050-malaysia-editor.service` is active on `168.144.107.250`,
  listening on `0.0.0.0:8797` for the Docker bridge only. Check with:
  `ssh tim@168.144.107.250 'systemctl status 5050-malaysia-editor.service'`.
  Logs: `journalctl -u 5050-malaysia-editor.service`. Done state: service active and
  `curl http://127.0.0.1:8797/admin/api/state` returns the profile/industry dataset.
- **Automatic Hugo sync:** `5050-malaysia-hugo-sync.timer` is active and runs every five
  minutes. It pulls `/home/tim/5050-malaysia-src` from GitHub and builds
  `/home/tim/5050-malaysia/`. Check with:
  `ssh tim@168.144.107.250 'systemctl list-timers 5050-malaysia-hugo-sync.timer'`.
- **Caddy:** `mrx-caddy` has the password-protected `/admin/` route for
  `5050malaysia.com` and a temporary HTTP IP test route. Caddy validated and reloaded
  successfully. The temporary test URL is `http://168.144.107.250/admin/`.
- **No local watchers remain running.** The attempted local Hugo/portless previews are
  stopped; the current verification target is Arrakis.

## NEXT STEPS

1. **[done]** Replace Decap/GitHub OAuth with the dependency-free editor service at
   `deploy/arrakis/5050-editor-server.js`.
2. **[done]** Generate an Arrakis repository-scoped deploy key and register it on the
   public GitHub repository with write access. Private key path on Arrakis:
   `/home/tim/.ssh/5050-malaysia-deploy`.
3. **[done]** Deploy NixOS editor/sync services and Caddy routes; verify Basic Auth,
   editor API, GitHub SSH access, and Hugo rebuild.
4. **[pending - Tashny test]** Test `http://168.144.107.250/admin/` using the admin
   credentials communicated in this session. Add or edit one harmless profile field,
   save, and verify the editor reports success and the next Hugo build completes.
5. **[blocked on DNS authority]** Cut the domain over from the live `duke/lady` Cloudflare
   zone to the prepared Arrakis zone (`denver/sneh`) or obtain access to the authoritative
   Cloudflare account. After DNS works, verify HTTPS and `/admin/` on
   `https://5050malaysia.com/admin/`.
6. **[pending after DNS]** Remove the temporary `http://168.144.107.250` Caddy test block
   and redeploy Caddy. Keep the Basic Auth route on the domain.
7. **[pending]** Store/rotate the dedicated editor Basic Auth credential in 1Password
   before public DNS cutover; no password is recorded in this file or git.
8. **[pending]** Replace the placeholder Google Form URL, confirm the contact email, add
   the final logo pack, and obtain GA4 access. Cynet renewal is due 2026-07-24.

## KEY RESULTS

- Hugo build passes with **274 pages**, **235 profiles**, and **33 industries**.
- Industry counts are computed from profile relationships; editors no longer maintain
  count fields manually.
- Arrakis editor API returned the live industry/profile dataset; unauthenticated Caddy
  request returned `401`, authenticated request returned `200` after the bridge-binding
  fix.
- The editor pushes through the deploy key; `git push --dry-run` on Arrakis reported
  `Everything up-to-date`.
- Successful source/build verification on Arrakis reached project commit `138424f`.
- Project commits this session include `d0fc678` (editor), `2f918ad` (dedicated port), and
  `138424f` (Caddy bridge binding). Arrakis-infra commits include `82fa9c3`, `6c9ba5d`,
  `89ba39e`, `b5674f2`, `5b8dce9`, `f319c22`, and `587a670`.
- Temporary test URL: `http://168.144.107.250/admin/`. Intended production URL:
  `https://5050malaysia.com/admin/` after DNS cutover.

## GOTCHAS

- The domain still resolves through the old authoritative Cloudflare `duke/lady` zone;
  the production hostname will not show Arrakis until DNS authority changes.
- The IP test route is explicitly HTTP and temporary. Do not treat it as the final public
  URL; remove it after DNS cutover.
- Arrakis port `8796` belongs to the unrelated Bifrost webhook. The editor uses `8797`.
- Caddy runs in Docker, so the editor must bind `0.0.0.0`; NixOS firewall rules allow
  `8797` only from the Docker bridge. Binding only `127.0.0.1` caused the observed 502.
- The Hugo sync service needs both Git, Hugo, and OpenSSH in its Nix `path`; missing SSH
  caused one failed sync before the service was corrected.
- Decap/GitHub OAuth is retired. Legacy `static/admin/` and OAuth source files remain for
  reference, but `/admin/` is routed to the password editor and the OAuth service is stopped.
- The Arrakis infra worktree still has unrelated dirty changes in `Caddyfile` and an
  untracked `hermes/` directory. Preserve them; do not reset or clean them.
- Do not rerun `scripts/import_hugo_content.py --force` after editor changes unless
  intentionally overwriting those changes.

## OPEN ITEMS (blocked on humans)

- DNS/registrar access: either GoDaddy nameserver control or the authoritative Cloudflare
  `duke/lady` account.
- Final editor password storage/rotation in 1Password before launch; credentials are not
  in this handover.
- Tashny's test of adding/editing a profile through the IP route.
- Real Google Form URL and owner, GA4 property access, final designer logo files, and
  `fiftyfiftymalaysia@gmail.com` operational inbox access if needed.
- Decide whether to renew Cynet hosting for RM150.12 due 2026-07-24.

## FILE MAP

- `HANDOVER.md` - this session state.
- `README.md` - project overview and editor workflow.
- `ADMIN-GUIDE.md` - nontechnical editor instructions.
- `DEPLOY-HUGO.md` - current Hugo/Arrakis editor and deployment runbook.
- `deploy/arrakis/5050-editor-server.js` - password-protected profile editor service.
- `static/admin/` - legacy Decap loader/config, retained as reference and not publicly routed.
- `content/` - Hugo source: 235 profiles, 33 industries, About, FAQ.
- `layouts/` and `static/assets/` - Hugo templates and public assets.
- Arrakis infra repo `/Users/tim/repos/arrakis-infra/nixos/configuration.nix` - editor,
  timer, SSH path, and firewall declarations.
- Arrakis infra repo `/Users/tim/repos/arrakis-infra/Caddyfile` - domain route and temporary
  IP test route; deployed to `/home/tim/caddy/Caddyfile` on `168.144.107.250`.
- Remote source `/home/tim/5050-malaysia-src`; served Hugo output `/home/tim/5050-malaysia`.
- Remote deploy key `/home/tim/.ssh/5050-malaysia-deploy` (secret; not in git).
