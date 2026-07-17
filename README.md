# 50-50 Malaysia - Hugo directory rebuild

A Hugo rebuild of [5050malaysia.com](https://5050malaysia.com/) - the directory of
Malaysian women experts - with a password-protected editor and static hosting on arrakis.

- **235 expert profiles** · **33 industries** · About + FAQ
- Client-side live search over the whole database
- Password-protected `/admin/` editor for non-technical profile editing
- GitHub content files as the source of truth and bus-factor backup
- Real logo + brand colour, light/dark theme aware, responsive

## Layout

```
content/
  profiles/         # editable expert profiles (one Markdown file each)
  industries/       # editable industry pages
  about.md faq.md   # editable static pages
layouts/            # Hugo templates
static/
  admin/            # legacy Decap files retained as a reference
  assets/           # logo, favicon, CSS, search JS
deploy/arrakis/     # Caddy snippet + password-protected editor service
scripts/
  import_hugo_content.py  # one-time import from scraped JSON; do not rerun after CMS edits
  deploy-arrakis.sh       # hugo build + rsync public/ to arrakis
assets/            # source brand assets (logo SVGs, favicon) pulled from the live site
build/
  build.py         # legacy static-site generator
  site.css         # shared stylesheet (design-2 "minimal")
  search.js        # homepage live search
  data.json        # scraped experts + industries (original import source)
  faq.json         # scraped FAQ Q&A
site/              # legacy generated static reference
  index.html  industries.html  about.html  faq.html
  industries/<slug>.html   (33)
  profiles/<slug>.html     (235)
public/            # Hugo build output, gitignored
CONTEXT.md         # background on the project/org
DEPLOY-HUGO.md     # current deploy runbook
DEPLOY.md          # superseded Ghost deploy runbook
```

## Build & preview

```bash
hugo --gc --minify
hugo server --bind 127.0.0.1 --port 1313
# open http://127.0.0.1:1313
```

Edit content in `content/` directly or through the password-protected editor. Do not re-run
`scripts/import_hugo_content.py --force` after CMS edits unless you intentionally want to
overwrite Hugo content from the old scraped JSON.

For the non-technical editor workflow, see [ADMIN-GUIDE.md](ADMIN-GUIDE.md).

## ⚠️ Before going live — replace placeholders

In `build/build.py`:

- `FORM_URL` is set to `https://forms.gle/REPLACE-WITH-REAL-SIGNUP-FORM` — swap in the real
  Google Form. (Note: on the live site the "fill out **here**" text in the FAQ is **not
  actually linked** — this rebuild wires a real Sign-up button everywhere, per tracker #1.)
- `CONTACT` = `fiftyfiftymalaysia@gmail.com` (decoded from the live site) — confirm it's current.

## Deploying (free Hugo stack on arrakis)

The production target is **Hugo + password-protected editor + GitHub backup + arrakis static hosting**. See
**[DEPLOY-HUGO.md](DEPLOY-HUGO.md)** for the runbook.

The editing path is:

1. Tashny logs into `/admin/` with the existing Arrakis Basic Auth credentials.
2. The editor validates and commits changes to the public GitHub repo through a repository-scoped deploy key.
3. The Hugo timer builds the static site every five minutes.
4. Arrakis serves the generated files through Caddy.

The editor service lives in `deploy/arrakis/5050-editor-server.js`; its deploy key and
Basic Auth remain outside the repository.

## Superseded Ghost work

The self-hosted Ghost migration was built and locally rehearsed, but Ghost is now considered
too heavy for this directory. The files remain for reference:

```
ghost/
  theme/            # custom Ghost theme "fiftyfifty" (design-2, passes gscan / Ghost 6.x)
    routes.yaml     #   preserves /profiles/{slug}/ and /industries/{slug}/
  content/import.js # Admin-API importer: 33 tags + 235 experts + About/FAQ from build/data.json
  deploy/           # docker-compose (Ghost+MySQL) + Caddyfile snippet + env.example
  build-theme-zip.sh# packages ghost/fiftyfifty.zip for upload
```

The `site/` static build and `ghost/` work stay as visual/reference fallbacks.

## Data notes

- Emails were Cloudflare-obfuscated on the live site; decoded here (231/235 have an email).
- No profile photos exist on the source site; profiles use monogram avatars.
- Industry counts are derived from the profiles, matching the live site
  (Human Rights 25, Political Science & Public Policy 24, Education/Journalism 19, …).
- Scraped from the live site on 2026-07-06.
