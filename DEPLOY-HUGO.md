# Deploy runbook - 50-50 Malaysia Hugo site on arrakis

This is the current recommended free stack. Ghost is retained in `ghost/` only as a
superseded migration rehearsal.

## Architecture

- Hugo builds the public site from `content/`.
- A password-protected editor is served at `/admin/` and writes changes back to GitHub.
- GitHub is the source of truth and bus-factor backup.
- Arrakis serves the generated static files from `/home/tim/5050-malaysia/` through Caddy.

## Local build

```bash
hugo --gc --minify
```

Preview locally:

```bash
hugo server --bind 127.0.0.1 --port 1313
```

## First content import

The current Hugo content was generated from `build/data.json` and `build/faq.json`:

```bash
python3 scripts/import_hugo_content.py --force
```

Do not re-run this after Tashy starts editing unless you intentionally want to overwrite
CMS/GitHub edits from the old scraped JSON.

## Admin editing

The password-protected editor lives at:

```text
https://5050malaysia.com/admin/
```

Caddy gates it with the existing Arrakis Basic Auth credential and reverse-proxies it to
the editor service on localhost port 8796. The service validates profile fields, writes
Hugo Markdown, commits the change, and pushes it through the repository-scoped deploy key
at `/home/tim/.ssh/5050-malaysia-deploy`. Tashny does not need a GitHub account.

The editor implementation is `deploy/arrakis/5050-editor-server.js`. The legacy
`static/admin/` Decap files remain in the repository as a reference but are no longer
routed publicly.

## Arrakis first deploy

1. Add `deploy/arrakis/Caddyfile.snippet` to `/Users/tim/repos/arrakis-infra/Caddyfile`.
2. Add this Caddy container volume in `/Users/tim/repos/arrakis-infra/mrx-compose.yml`:

   ```yaml
   - /home/tim/5050-malaysia:/srv/5050-malaysia:ro
   ```

3. Generate a repository-scoped deploy key on arrakis and add the public half to the
   GitHub repository with write access. The private key must stay at
   `/home/tim/.ssh/5050-malaysia-deploy` and must never enter git.

4. Apply the declarative NixOS services in `arrakis-infra/nixos/configuration.nix` and
   deploy the Caddy route for `/admin/`:

   ```bash
   cd /Users/tim/repos/arrakis-infra
   ./deploy-caddy.sh --restart
   ```

5. Build and rsync the site:

   ```bash
   ./scripts/deploy-arrakis.sh
   ```

6. Point `5050malaysia.com` and `www.5050malaysia.com` DNS at arrakis
   (`168.144.107.250`) when ready to cut over.

## Ongoing deploy

For manual deploys:

```bash
./scripts/deploy-arrakis.sh
```

The recommended production setup is an arrakis systemd timer. Every five minutes it pulls
the public source repository and rebuilds the served directory, so an editor publish becomes
live automatically. The timer is declared in `arrakis-infra/nixos/configuration.nix` as
`5050-malaysia-hugo-sync`.

For a manual pull/build model, run:

```bash
cd /home/tim/5050-malaysia-src
git pull --ff-only
hugo --gc --minify --destination /home/tim/5050-malaysia
```

This keeps GitHub as the source of truth while arrakis remains only the static host. The
first timer run clones `https://github.com/timothyylim/5050-malaysia` into
`/home/tim/5050-malaysia-src`; subsequent runs use fast-forward-only pulls.
