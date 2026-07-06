# 50-50 Malaysia — local rebuild

A local static rebuild of [5050malaysia.com](https://5050malaysia.com/) — the directory
of Malaysian women experts — restyled in the "minimal" design direction (indigo `#5f5fd3`,
clean/whitespace-forward), using the site's **real content** scraped from the live site.

- **235 expert profiles** · **33 industries** · About + FAQ
- Client-side live search over the whole database (no backend)
- Real logo + brand colour, light/dark theme aware, responsive

## Layout

```
assets/            # source brand assets (logo SVGs, favicon) pulled from the live site
build/
  build.py         # generates the whole site into ../site/
  site.css         # shared stylesheet (design-2 "minimal")
  search.js        # homepage live search
  data.json        # scraped experts + industries (source of truth)
  faq.json         # scraped FAQ Q&A
site/              # GENERATED output — this is the deployable site
  index.html  industries.html  about.html  faq.html
  industries/<slug>.html   (33)
  profiles/<slug>.html     (235)
  assets/  (site.css, search.js, data.json, logo.svg, logo-inverse.svg, favicon)
CONTEXT.md         # background on the project/org
```

## Build & preview

```bash
cd build && python3 build.py          # regenerate site/
cd ../site && python3 -m http.server 8899   # serve (fetch() needs http, not file://)
# open http://localhost:8899
```

Edit content in `build/data.json` / `build/faq.json`, then re-run `build.py`.

## ⚠️ Before going live — replace placeholders

In `build/build.py`:

- `FORM_URL` is set to `https://forms.gle/REPLACE-WITH-REAL-SIGNUP-FORM` — swap in the real
  Google Form. (Note: on the live site the "fill out **here**" text in the FAQ is **not
  actually linked** — this rebuild wires a real Sign-up button everywhere, per tracker #1.)
- `CONTACT` = `fiftyfiftymalaysia@gmail.com` (decoded from the live site) — confirm it's current.

## Deploying (self-hosted Ghost)

The production target is **self-hosted open-source Ghost** on our own server. Everything is
prepared and **locally rehearsed** (booted Ghost in Docker, uploaded the theme, ran the
importer, verified every route) — see **[DEPLOY.md](DEPLOY.md)** for the ~15-min runbook.

```
ghost/
  theme/            # custom Ghost theme "fiftyfifty" (design-2, passes gscan / Ghost 6.x)
    routes.yaml     #   preserves /profiles/{slug}/ and /industries/{slug}/
  content/import.js # Admin-API importer: 33 tags + 235 experts + About/FAQ from build/data.json
  deploy/           # docker-compose (Ghost+MySQL) + Caddyfile snippet + env.example
  build-theme-zip.sh# packages ghost/fiftyfifty.zip for upload
```

Content model: **expert = post**, **industry = tag**, About/FAQ = pages. The Google Form URL
is a Ghost **theme setting** (editable in admin, no code) — that solves the sign-up button (#1).
Deploy is blocked only on credentials (tracker #6 → #7).

The `site/` static build stays as a fast visual reference / fallback.

## Data notes

- Emails were Cloudflare-obfuscated on the live site; decoded here (231/235 have an email).
- No profile photos exist on the source site; profiles use monogram avatars.
- Industry counts are derived from the profiles, matching the live site
  (Human Rights 25, Political Science & Public Policy 24, Education/Journalism 19, …).
- Scraped from the live site on 2026-07-06.
