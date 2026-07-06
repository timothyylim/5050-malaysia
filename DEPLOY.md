# Deploy runbook — 50-50 Malaysia on self-hosted Ghost

Everything below is prepared locally. When the credentials from tracker **#6** land,
this is a ~15–20 minute deploy. Do the steps in order.

## What's already built (local, done)

| Piece | Location | Status |
|-------|----------|--------|
| Custom Ghost theme ("minimal" design, real logo) | `ghost/theme/` | ✅ passes `gscan` (0 errors) |
| URL routing (`/profiles/…`, `/industries/…`) | `ghost/theme/routes.yaml` | ✅ |
| Content importer (235 experts, 33 industries, About/FAQ) | `ghost/content/import.js` | ✅ dry-run OK |
| Server stack (Ghost + MySQL) | `ghost/deploy/docker-compose.yml` | ✅ |
| Reverse proxy / TLS | `ghost/deploy/Caddyfile.snippet` | ✅ |
| Static reference build (for preview/compare) | `site/` | ✅ live-previewable |

## Credentials needed (from #6) before you can deploy

- Server SSH access (your own server)
- A domain / DNS control for the hostname you'll launch on (real domain or a staging subdomain)
- SMTP creds for Ghost mail (Mailgun/Postmark/SES) — needed for admin invite emails
- (Later, for cutover) registrar + current host access to repoint DNS

---

## Steps

### 1. Bring up Ghost on the server
```bash
scp -r ghost/deploy  you@server:/opt/5050/          # or git pull on the server
cd /opt/5050/deploy
cp env.example .env && edit .env                     # strong DB passwords -> 1Password
# set `url:` in docker-compose.yml (staging subdomain first, e.g. https://staging.5050malaysia.com)
docker compose up -d
docker compose logs -f ghost                          # wait for "Ghost is running"
```

### 2. Front it with Caddy (TLS)
Append `deploy/Caddyfile.snippet` to your Caddyfile (edit the hostname), then reload Caddy.
Point the hostname's DNS A record at the server. Visit `https://HOST/ghost` and create the
admin account. **Store admin login in 1Password.**

> Tip: launch on a **staging subdomain** first so the whole thing is verified before touching
> the live `5050malaysia.com` DNS.

### 3. Upload the theme
Ghost admin → **Settings → Design → Change theme → Upload theme** → upload `fiftyfifty.zip`
(build it with `bash ghost/build-theme-zip.sh`). **Activate** it.

### 4. Set the URL routing
Ghost admin → **Settings → Labs → Routes → Upload routes.yaml** → upload
`ghost/theme/routes.yaml`. (This makes experts `/profiles/{slug}/` and industries
`/industries/{slug}/`.)

### 5. Import the content
```bash
cd ghost/content
cp .env.example .env      # add GHOST_URL + GHOST_ADMIN_KEY (Ghost: Settings → Integrations → Add custom integration)
npm install
npm run dry               # sanity check
npm run import            # creates 33 tags, 235 experts, About/FAQ/Industries pages
```

### 6. Wire up navigation + settings
- **Settings → Navigation**: Browse=`/`, Industries=`/industries/`, About=`/about/`, FAQs=`/faq/`.
- **Settings → Design → Theme settings**: paste the **real Google Form URL** into
  *Signup form url* (this fills every Join button — tracker #1). Confirm *Contact email*.
- Set site title, description, icon (`ghost/theme/assets/images/favicon-32.png`), and
  accent colour `#5f5fd3`.
- Enable **Members off** if not using subscriptions (this is a directory, not a newsletter).

### 7. Analytics (tracker #3)
Ghost admin → **Settings → Advanced → Code injection → Site header**: paste the GA4 snippet.

### 8. Verify, then cut over
- Check: home search, an `/industries/human-rights/` page (should show 25), a `/profiles/…`
  page (name, role, specialisation, mailto), About, FAQ, mobile + dark mode.
- When happy, repoint `5050malaysia.com` DNS to the server and set `url:` to the apex domain
  (edit docker-compose env, `docker compose up -d`).

## Notes / gotchas
- **Emails**: the source emails are decoded and shown as `mailto:` (the original obfuscated
  them with Cloudflare). If Tashny wants obfuscation back, add a small JS shim — flag it.
- **No photos** exist in the source data; profiles use monogram avatars.
- **Search** uses Ghost's built-in search (searches names/excerpts). Good enough for this size.
- Re-running the importer **skips** slugs that already exist, so it's safe to re-run.
- Keep the real `.env` files out of git (see `.gitignore`).
