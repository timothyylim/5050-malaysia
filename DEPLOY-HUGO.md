# Deploy runbook - 50-50 Malaysia Hugo site on arrakis

This is the current recommended free stack. Ghost is retained in `ghost/` only as a
superseded migration rehearsal.

## Architecture

- Hugo builds the public site from `content/`.
- Decap CMS is served at `/admin/` and writes changes back to GitHub.
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

Decap CMS lives at:

```text
https://5050malaysia.com/admin/
```

Production auth is configured for GitHub:

```yaml
backend:
  name: github
  repo: timothyylim/5050-malaysia
  branch: main
  base_url: https://5050malaysia.com
  auth_endpoint: /admin/oauth/auth
```

Before launch, confirm the GitHub repo path and create a GitHub OAuth App:

- Homepage URL: `https://5050malaysia.com`
- Authorization callback URL: `https://5050malaysia.com/admin/oauth/callback`

Tashy needs a free GitHub account with write access to the repo.

## Arrakis first deploy

1. Add `deploy/arrakis/Caddyfile.snippet` to `/Users/tim/repos/arrakis-infra/Caddyfile`.
2. Add this Caddy container volume in `/Users/tim/repos/arrakis-infra/mrx-compose.yml`:

   ```yaml
   - /home/tim/5050-malaysia:/srv/5050-malaysia:ro
   ```

3. Install the free Decap OAuth proxy on arrakis.

   Copy the proxy source and create its secret env file:

   ```bash
   ssh arrakis 'mkdir -p /home/tim/5050-malaysia-oauth'
   scp deploy/arrakis/decap-oauth-server.js arrakis:/home/tim/5050-malaysia-oauth/
   ssh arrakis 'cat > /home/tim/5050-malaysia-oauth/.env <<EOF
   GITHUB_CLIENT_ID=REPLACE
   GITHUB_CLIENT_SECRET=REPLACE
   OAUTH_REDIRECT_URI=https://5050malaysia.com/admin/oauth/callback
   GITHUB_SCOPE=public_repo
   EOF'
   ```

   Store the OAuth app secret outside the repo. Then add the service declaratively in
   `/Users/tim/repos/arrakis-infra/nixos/configuration.nix` and rebuild arrakis:

   ```nix
   systemd.services."5050-malaysia-decap-oauth" = {
     description = "50-50 Malaysia Decap GitHub OAuth proxy";
     after = [ "network-online.target" ];
     wants = [ "network-online.target" ];
     wantedBy = [ "multi-user.target" ];
     serviceConfig = {
       User = "tim";
       WorkingDirectory = "/home/tim/5050-malaysia-oauth";
       EnvironmentFile = "/home/tim/5050-malaysia-oauth/.env";
       ExecStart = "${pkgs.nodejs}/bin/node /home/tim/5050-malaysia-oauth/decap-oauth-server.js";
       Restart = "always";
       RestartSec = 5;
     };
   };
   ```

   ```bash
   ssh arrakis 'sudo nixos-rebuild switch'
   ```

   `deploy/arrakis/decap-oauth.service` is kept as a portable reference unit, but arrakis
   should use the NixOS declaration above.

4. Deploy/restart Caddy because this adds a new bind mount:

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

For a pull/build model, create an arrakis systemd timer or cron that runs:

```bash
cd /home/tim/5050-malaysia-src
git pull --ff-only
hugo --gc --minify --destination /home/tim/5050-malaysia
```

This keeps GitHub as the source of truth while arrakis remains only the static host.
