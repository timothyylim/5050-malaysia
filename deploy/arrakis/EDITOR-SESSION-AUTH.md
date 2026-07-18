# Editor session auth (persistent login)

## What changed and why

Until now `/admin/` was protected by **Caddy HTTP Basic Auth**. Basic Auth has no
concept of a session: the browser holds the credentials only for the life of the
window and forgets them when it closes, so editors had to re-enter the password
constantly.

Auth now lives **inside the editor app** (`5050-editor-server.js`, still Node
stdlib only — `node:http` + `node:crypto`, zero dependencies) so a successful
login persists for ~1 year via a signed cookie.

New behaviour in `5050-editor-server.js`:

- Reads two env vars:
  - `EDITOR_PASSWORD` — the plaintext password an editor types on the login page.
  - `SESSION_SECRET` — the HMAC key used to sign/verify session cookies.
- If **either** is unset the server still starts, logs a clear warning, and runs
  **fail-closed**: every gated `/admin` route is rejected until both are set.
- `GET /admin/login` — self-contained HTML login form (matches the editor's inline-CSS style).
- `POST /admin/login` — compares the submitted password to `EDITOR_PASSWORD` in
  **constant time** (`crypto.timingSafeEqual` over SHA-256 digests, so differing
  lengths are safe). On success it sets the cookie and 302s to `/admin/`; on
  failure it re-renders the form with an error and sets no cookie.
- Session cookie `5050_session`:
  - value: `<expiryEpochMs>.<hex HMAC-SHA256(expiryEpochMs, SESSION_SECRET)>`
  - attributes: `HttpOnly; Secure; SameSite=Lax; Path=/admin; Max-Age=31536000`
- Auth gate applied to **every** `/admin` route **except** `/admin/login`
  (and `/admin/logout`): it parses the `Cookie` header, recomputes and verifies
  the HMAC in constant time, and checks the expiry.
  - Unauthenticated API request (`/admin/api/*`) → `401 {"error":...}` JSON.
  - Unauthenticated editor page GET → `302` to `/admin/login`.
- `GET /admin/logout` — clears the cookie (`Max-Age=0`) and redirects to `/admin/login`.
  A "Sign out" link in the editor header points here.

The human-facing password is unchanged: `hKcIXZNKzeAOYaBxBtaec6LA`.

## Infra deltas to deploy — these ship ATOMICALLY together

> **Why atomic:**
> - Editor self-gating **without** removing Caddy Basic Auth = **double auth**
>   (editors get prompted by Caddy *and* the app login page).
> - Removing Caddy Basic Auth **without** `EDITOR_PASSWORD` set = the editor runs
>   fail-closed at best, but any misconfiguration or a future "temporarily
>   disable auth" mistake now has no Caddy backstop = **exposure risk**.
>
> Deploy (a) and (b) in the **same** change window. Verify the app login works
> before, or in the same step as, dropping Basic Auth.

### (a) Caddyfile — remove Basic Auth from the `@editor handle`

On the `5050malaysia.com` site block, drop the `basic_auth` block from the
`@editor handle` so the editor self-gates. Keep the `reverse_proxy` and the
`X-Robots-Tag` header.

Before:

```caddyfile
@editor path /admin /admin/*
handle @editor {
    basic_auth * {
        admin <bcrypt-hash>
    }
    header X-Robots-Tag "noindex, nofollow"
    reverse_proxy host.docker.internal:8797
}
```

After:

```caddyfile
@editor path /admin /admin/*
handle @editor {
    header X-Robots-Tag "noindex, nofollow"
    reverse_proxy host.docker.internal:8797
}
```

(Leave the separate `/admin/oauth/*` handle, `root`, and `file_server` as-is.)

### (b) systemd — supply `EDITOR_PASSWORD` + `SESSION_SECRET` via an EnvironmentFile

The secrets must **not** live in git. Put them in a root-owned EnvironmentFile on
the Arrakis host and point the unit at it.

Generate a strong session secret:

```sh
openssl rand -hex 32
```

Create the secret file (host only, e.g. `/etc/5050-malaysia-editor.env`):

```sh
# /etc/5050-malaysia-editor.env  — NOT in git; root-owned, chmod 600
EDITOR_PASSWORD=hKcIXZNKzeAOYaBxBtaec6LA
SESSION_SECRET=<paste output of: openssl rand -hex 32>
```

```sh
sudo chown root:root /etc/5050-malaysia-editor.env
sudo chmod 600 /etc/5050-malaysia-editor.env
```

Reference it from `5050-malaysia-editor.service`:

```ini
[Service]
EnvironmentFile=/etc/5050-malaysia-editor.env
# ...existing ExecStart etc...
```

Then:

```sh
sudo systemctl daemon-reload
sudo systemctl restart 5050-malaysia-editor
# confirm the fail-closed warning is ABSENT in the logs:
journalctl -u 5050-malaysia-editor -n 20
```

### Rotating the session secret

Changing `SESSION_SECRET` invalidates all existing sessions (everyone must log in
again). Rotate it if you suspect leakage; otherwise leave it stable so the ~1-year
sessions survive restarts and deploys.
