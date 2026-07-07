# HANDOVER — 5050-malaysia

**2026-07-07, ~10:00 (Asia/Kuala_Lumpur / GMT+8).** Rebuilding 50-50 Malaysia (directory of
women experts) and migrating it off WordPress to **self-hosted open-source Ghost**. The rebuild
+ Ghost migration are **built and locally rehearsed**; deployment is blocked only on credentials.

## RUNNING RIGHT NOW
- **None persistent.** No detached jobs, deploys, or cron.
- A local static preview server (`python3 -m http.server 8899` in `site/`) was started and
  later **killed** — not running. Re-arm with `cd site && python3 -m http.server 8899` if needed.
- The Docker rehearsal Ghost container (`ghost-test`) was **torn down** (removed, volumes pruned).
- Docker Desktop was started this session and left running (harmless).

## NEXT STEPS
The work is staged so that once credentials land it's a ~15-min deploy (`DEPLOY.md`).
1. **[pending — blocked] Get credentials from Tashny** (tracker #6). Priority order:
   **(1) Cloudflare** (the real DNS control — #1 blocker), **(2) the own server for Ghost**
   (SSH), **(3) SMTP** for Ghost mail, (4) access to the existing **GA4 property**,
   (5) Google Form owner + real form URL, (6) fiftyfiftymalaysia@gmail.com inbox.
2. **[pending — blocked] Deploy** (tracker #7): follow `DEPLOY.md` — docker compose up →
   Caddy/TLS → upload `ghost/fiftyfifty.zip` → upload `routes.yaml` → run importer →
   set nav + Google Form URL + GA → verify → cut over DNS in **Cloudflare** (lower A-record
   TTL, point A at new server IP; no registrar change needed).
3. **[optional, doable now] Pull authoritative content** from the live WordPress REST API
   (`https://5050malaysia.com/wp-json/wp/v2/…`, open, no login) and diff vs. the HTML scrape
   in `build/data.json` to catch anything missed before importing to Ghost.
4. **[waiting on Tashny] Real logo pack** — she has the designer's original files (incl. a
   proper light-background logo); swap into `ghost/theme/assets/images/logo.svg` when received.

## KEY RESULTS
- Scraped live site via sitemaps: **3 pages, 235 expert profiles, 33 industries**. Parsed into
  `build/data.json` (+ `faq.json`). Emails were Cloudflare-obfuscated → decoded (231/235).
- Static rebuild in `site/` (design "minimal", real logo/brand `#5f5fd3`, JS search) — all
  routes verified 200.
- Ghost theme `fiftyfifty` **passes gscan → compatible with Ghost 6.x** (0 errors).
- **Full local rehearsal succeeded**: booted Ghost in Docker, uploaded+activated theme,
  uploaded routes, ran importer → **235 experts created**, every route rendered 200 with
  correct data (home industry grid, Human Rights = **25**, Tashny profile fields + mailto,
  About, FAQ).
- **DNS reality (dig/whois):** nameservers = **Cloudflare** (duke/lady.ns.cloudflare.com),
  registrar = **GoDaddy** (exp 2026-12-16), site served **through Cloudflare**.
- **Live site fingerprint (dev tools):** **WordPress 7.0**, `wp-json` REST API **open**,
  **GA4 already installed** (`G-K7M2VY5E2F`) + Cloudflare RUM.
- **Cynet origin `78.47.57.7:2082` is DEAD** — timed out in a real browser; 2022 cPanel creds
  are useless for server access.

## GOTCHAS
- The 2022 Cynet hosting email is **stale**: site moved behind Cloudflare; that IP no longer
  serves. Don't plan around cPanel/FTP access to it.
- **cPanel does NOT control DNS** — Cloudflare does. The DNS-cutover credential is **Cloudflare**.
- Ghost content model: **expert = post**, **industry = tag** (internal tag `#expert` marks
  experts; keeps them out of the public tag list). `routes.yaml` gives `/profiles/{slug}/` and
  `/industries/{slug}/`. Home `/` is the collection archive but renders `index.hbs` (a landing,
  not a post list).
- Ghost Admin API returns the admin key as `id:secret` **in the `secret` field already** — don't
  re-prepend the id (that was a wasted debug loop).
- Ghost `{{#get}}` doesn't like `limit="all"` (gscan warns) — use a numeric limit; theme uses 50.
- Importer HTML → Ghost lexical via `{source:'html'}`; the `.detail/.field` markup survives as an
  HTML card, which the theme CSS styles. Importer **skips existing slugs** (safe to re-run).
- The live site's FAQ "fill out **here**" has **no link** (sign-up form is effectively missing) —
  the rebuild wires a Join CTA everywhere via the theme's `signup_form_url` custom setting (#1).
- `#3 "Add GA"` is largely already done — GA4 `G-K7M2VY5E2F` is live; real need is *access* to it.

## OPEN ITEMS (blocked on humans — Tashny)
- **Cloudflare login** (DNS cutover) — top priority.
- **The server** for Ghost (SSH) + **SMTP** creds.
- **GA4 property access** (`G-K7M2VY5E2F`) and the **real Google Form URL** (+ who owns it).
- **Renewal decision:** Cynet hosting renewal ~RM150 due **2026-07-24** — likely *don't renew*
  if migrated by then, but **keep the GoDaddy domain**. Needs Tashny's call.
- Designer's **original logo files**.
- Credentials live in **1Password → Backup vault** (personal account timothylim23@gmail.com).
  Saved so far: "Cynet Hosting cPanel — 5050malaysia.com". **No credentials in this doc.**

## FILE MAP
- `build/` — `data.json`, `faq.json` (scraped source), `build.py`, `site.css`, `search.js`.
- `site/` — generated static rebuild (preview: `cd site && python3 -m http.server 8899`).
- `ghost/theme/` — Ghost theme `fiftyfifty` (+ `routes.yaml`). Zip via `ghost/build-theme-zip.sh`
  → `ghost/fiftyfifty.zip` (gitignored).
- `ghost/content/` — `import.js` (Admin-API importer), `package.json`, `.env.example`.
- `ghost/deploy/` — `docker-compose.yml`, `Caddyfile.snippet`, `env.example`.
- `DEPLOY.md` — deploy runbook. `README.md` — repo overview. `CONTEXT.md` — org background.
- `issues/` — tracker (`~/bin/tracker-db`, `TRACKER_DIR=issues`). Open: #1,#3,#4,#5,#6; #7 blocked by #6; #2 in progress.
- Raw scrape + rehearsal artifacts are in the session scratchpad (not in repo).
- Git: initial commit `84c8202` on `main` (316 files; secrets/artifacts gitignored). HANDOVER not yet committed.
