# HANDOVER - 5050-malaysia

**2026-07-08 16:25 +08 (Asia/Kuala_Lumpur).** Rebuilding 50-50 Malaysia
(directory of women experts) and migrating it off WordPress to a free Hugo + Decap CMS
stack, with GitHub as the source of truth and arrakis as the static host. The Hugo
conversion is implemented and locally verified; production is blocked on GitHub remote/auth,
arrakis infra wiring, and DNS cutover.

## RUNNING RIGHT NOW
- **Local preview server running in this Codex session:** `hugo server --bind 127.0.0.1
  --port 1313 --disableFastRender`, URL `http://localhost:1313/`. This is a local session
  process and will die when the session/tool process is stopped; restart from repo root with
  `HUGO_CACHEDIR=/Users/tim/repos/5050-malaysia/.hugo_cache hugo server --bind 127.0.0.1
  --port 1313 --disableFastRender`.
- No detached arrakis jobs, production deploys, cron, or Docker rehearsal containers are
  running for this project.
- A temporary Gmail venv was created under `/private/tmp/tools-gmail-venv` during the Cynet
  lookup and was removed.

## NEXT STEPS
1. **[done] Recover and verify Cynet access.** Used `$tools` Gmail search to find Tashny's
   forwarded Cynet setup email and invoice. Verified Cynet client-area login and cPanel SSO.
2. **[done] Smoke-test Cynet origin.** Confirmed `91.107.211.163` is the active Cynet shared
   IP for `5050malaysia.com`: forced-origin HTTPS apex returns `200` with WordPress headers;
   `www` and HTTP redirect to `https://5050malaysia.com/`.
3. **[done] Smoke-test Tim's Cloudflare credentials.** Verified the saved Cloudflare API token
   is active and can read Tim's Cloudflare zone for `5050malaysia.com`.
4. **[pending - choose DNS path before any writes]**
   - If using **Tim's Cloudflare account**, first create DNS records in the pending zone:
     apex `A -> 91.107.211.163` and `www -> 5050malaysia.com` (or `A -> 91.107.211.163`),
     then change registrar nameservers to `denver.ns.cloudflare.com` and
     `sneh.ns.cloudflare.com`. Do **not** change nameservers while the zone has zero records.
   - If editing the **currently live Cloudflare zone**, get credentials for the account using
     `duke.ns.cloudflare.com` and `lady.ns.cloudflare.com`. The current creds do not control
     that authoritative zone.
   - Decision rule: do not perform a DNS write until the intended target is explicit:
     "keep current Cynet WordPress live", "cut over to Ghost", or "move live DNS into Tim's
     Cloudflare first".
5. **[done - local Hugo implementation]** Issue #8 now tracks the pivot. Implemented Hugo
   config/templates, editable `content/` source, Decap CMS admin config, free GitHub OAuth
   proxy for arrakis, arrakis Caddy/deploy assets, and `DEPLOY-HUGO.md`. Verified local
   build and preview.
6. **[pending - production GitHub setup]** Add a real GitHub remote/repo for this project,
   update `static/admin/config.yml` if the repo path is not `timothyylim/5050-malaysia`, and
   give Tashy write access.
7. **[pending - Decap auth]** Create a GitHub OAuth App with callback
   `https://5050malaysia.com/admin/oauth/callback`; put the client id/secret in
   `/home/tim/5050-malaysia-oauth/.env` on arrakis, not in git.
8. **[pending - arrakis deploy]** Apply `deploy/arrakis/Caddyfile.snippet` and the OAuth
   service to `/Users/tim/repos/arrakis-infra` declaratively, add the `/home/tim/5050-malaysia`
   bind mount, deploy Caddy with `--restart`, then run `scripts/deploy-arrakis.sh`.
9. **[optional, doable now]** Pull authoritative content from the live WordPress REST API
   (`https://5050malaysia.com/wp-json/wp/v2/...`, open, no login) and diff against
   `content/` before launch.
10. **[waiting on Tashny]** Real logo pack. She has the designer's original files, including a
   proper light-background logo; swap into `static/assets/logo.svg` when received.

## KEY RESULTS
- Scraped live site via sitemaps: **3 pages, 235 expert profiles, 33 industries**. Parsed into
  `build/data.json` plus `build/faq.json`. Emails were Cloudflare-obfuscated and decoded
  (231/235).
- Static rebuild in `site/` is complete: minimal design, real logo/brand `#5f5fd3`, JS search,
  all generated routes previously verified 200.
- Hugo rebuild is now the active implementation:
  - `content/` has 235 editable profile Markdown files, 33 editable industry files, About,
    FAQ, and profiles/industries section indexes.
  - `hugo --gc --minify` builds cleanly with **274 pages**, no warnings.
  - Verified source/build counts: 235 profiles and 33 industries in both.
  - Verified representative generated routes: `/`, `/index.json`, `/admin/config.yml`,
    `/industries/human-rights/`, `/profiles/adhura-husna/`.
  - Decap admin is configured at `/admin/` with GitHub backend and
    `/admin/oauth/auth` auth endpoint.
  - Free OAuth proxy syntax and health endpoint were tested locally with dummy credentials.
- Ghost theme `fiftyfifty` passes gscan for Ghost 6.x with 0 errors, but Ghost is now
  superseded because it is too heavy for this directory.
- Full local Ghost rehearsal previously succeeded: booted Ghost in Docker, uploaded and
  activated theme, uploaded routes, ran importer, created 235 experts, and verified home,
  Human Rights count 25, profile fields/mailto, About, and FAQ.
- Live DNS today:
  - `5050malaysia.com` and `www.5050malaysia.com` resolve to Cloudflare edge IPs
    `172.67.200.201` and `104.21.36.229`.
  - Authoritative nameservers are `duke.ns.cloudflare.com` and `lady.ns.cloudflare.com`.
- Tim's Cloudflare credentials today:
  - API token is active.
  - Zone `5050malaysia.com` exists in Tim's Cloudflare account, but status is **pending**.
  - Pending-zone nameservers are `denver.ns.cloudflare.com` and `sneh.ns.cloudflare.com`.
  - The pending zone has **zero DNS records**.
  - Global API key sees the same pending zone, not the live `duke/lady` zone.
- Cynet today:
  - Old origin `78.47.57.7:2082/2083` still times out.
  - Cynet client area works at `https://manage.cynet.com.my/sign-in` with the current
    credentials stored outside the repo.
  - Service `#12818` has a working cPanel SSO link.
  - cPanel SSO lands on `gida.cynethost.com:2083`, primary domain `5050malaysia.com`,
    shared IP `91.107.211.163`, home `/home/malaysi5`.
  - Direct cPanel login with the known username and current Cynet client-area password returns
    `401`; use Cynet SSO instead.
- Live site fingerprint remains WordPress with open REST API and GA4 `G-K7M2VY5E2F` plus
  Cloudflare RUM.

## GOTCHAS
- There are two Cloudflare realities:
  - The **live** zone is on `duke/lady` and is not controlled by the saved Tim Cloudflare creds.
  - Tim's zone is **pending** on `denver/sneh` and empty. It can probably be prepared, but
    switching registrar nameservers to it before adding records would break the site.
- "Point Cynet to Cloudflare" can mean two different operations:
  - Update Cloudflare DNS records to point at Cynet origin `91.107.211.163`.
  - Change registrar nameservers so Tim's Cloudflare zone becomes authoritative.
  Treat these as separate steps.
- The current Cynet password works for the Cynet billing/client area, not direct cPanel login.
  Use the service `#12818` cPanel SSO link.
- The 2022 Cynet setup email is partly stale: old IP `78.47.57.7` is dead, but the account and
  service record are still active.
- cPanel does not control live DNS. Cloudflare/registrar authority controls DNS cutover.
- Ghost content model: expert = post, industry = tag. Internal tag `#expert` marks experts and
  keeps them out of the public tag list. `routes.yaml` gives `/profiles/{slug}/` and
  `/industries/{slug}/`. Home `/` is the collection archive but renders `index.hbs`.
- Hugo content model: expert = `content/profiles/{slug}.md`; industry =
  `content/industries/{slug}.md`; About/FAQ = single Markdown files. `build/data.json` and
  `build/faq.json` were only the import source. After Tashy edits via Decap, do **not** rerun
  `scripts/import_hugo_content.py --force` unless intentionally overwriting those edits.
- `public/`, `.hugo_cache/`, and `.hugo_build.lock` are ignored build artifacts.
- Production Decap login needs a GitHub OAuth App and the Node OAuth proxy on arrakis; the
  proxy code is in `deploy/arrakis/decap-oauth-server.js`.
- Ghost Admin API returns the admin key as `id:secret` in the `secret` field already; do not
  prepend the id again.
- Ghost `{{#get}}` does not like `limit="all"`; use a numeric limit. Theme uses 50.
- Importer HTML to Ghost lexical via `{source:'html'}` preserves the `.detail/.field` markup,
  which the theme CSS styles. Importer skips existing slugs, so it is safe to re-run.
- The live site's FAQ "fill out here" has no link. The rebuild wires Join CTAs via the Ghost
  theme setting `signup_form_url`.
- Tracker #3 "Add GA" is largely already done on the live site; real need is access to the GA4
  property.

## OPEN ITEMS (blocked on humans)
- Decide DNS strategy:
  - get access to the live `duke/lady` Cloudflare account, or
  - prepare Tim's pending Cloudflare zone and change registrar nameservers to `denver/sneh`.
- If using Tim's pending Cloudflare zone, get/confirm registrar access for changing
  nameservers. Registrar is GoDaddy; domain expiry is 2026-12-16.
- For Hugo production: GitHub remote/repo, Tashy GitHub collaborator access, GitHub OAuth App
  client id/secret, arrakis infra changes, and final DNS authority.
- GA4 property access for `G-K7M2VY5E2F`.
- Real Google Form URL and owner.
- `fiftyfiftymalaysia@gmail.com` inbox access if needed for operational handoff.
- Renewal decision: Cynet hosting renewal is RM150.12, due **2026-07-24**. If migrated before
  then, likely do not renew hosting; keep the GoDaddy domain.
- Designer's original logo files.
- Credentials live outside the repo in 1Password / Gmail / provider accounts. No credentials
  are stored in this handover.

## FILE MAP
- `HANDOVER.md` - this current-state handover; overwritten each handover.
- `README.md` - repo overview, build/preview instructions, Ghost deployment summary.
- `DEPLOY.md` - self-hosted Ghost deployment runbook.
- `DEPLOY-HUGO.md` - current Hugo + Decap + arrakis deployment runbook.
- `hugo.toml` - Hugo site config.
- `content/` - editable Hugo source of truth for profiles, industries, About, and FAQ.
- `layouts/` - Hugo templates for home/search JSON, profiles, industries, and pages.
- `static/admin/` - Decap CMS loader and collection config.
- `static/assets/` - Hugo-served CSS, search JS, logo, favicon.
- `scripts/import_hugo_content.py` - one-time importer from scraped JSON to Hugo content.
- `scripts/deploy-arrakis.sh` - builds Hugo and rsyncs `public/` to arrakis.
- `deploy/arrakis/` - Caddy snippet plus Decap GitHub OAuth proxy/service template.
- `CONTEXT.md` - org/project background.
- `build/` - source data and static-site generator:
  `data.json`, `faq.json`, `build.py`, `site.css`, `search.js`.
- `site/` - generated static rebuild; preview with
  `cd site && python3 -m http.server 8899`.
- `ghost/theme/` - Ghost theme `fiftyfifty`, `routes.yaml`, assets, partials. Zip with
  `ghost/build-theme-zip.sh` to create gitignored `ghost/fiftyfifty.zip`.
- `ghost/content/` - Ghost Admin API importer, package files, `.env.example`.
- `ghost/deploy/` - Docker Compose, Caddy snippet, env example.
- `issues/` - local tracker DB. Current worktree shows `issues/issues.db` modified; this was
  pre-existing during the handover update and was not changed intentionally here.
- 1Password accessible vault in this session was `Borneo History`; relevant saved items include
  Cloudflare API entries. Do not copy secrets into repo docs.
- Git state at handover: `HANDOVER.md` modified; `issues/issues.db` also modified from prior
  work.
