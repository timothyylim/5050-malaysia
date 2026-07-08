#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const http = require("http");
const https = require("https");
const { URL } = require("url");

const port = Number(process.env.PORT || 8794);
const clientId = process.env.GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;
const redirectUri = process.env.OAUTH_REDIRECT_URI || "https://5050malaysia.com/admin/oauth/callback";
const scope = process.env.GITHUB_SCOPE || "public_repo";

if (!clientId || !clientSecret) {
  console.error("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required");
  process.exit(1);
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exchangeCode(code) {
  const payload = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "github.com",
        path: "/login/oauth/access_token",
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "User-Agent": "5050-malaysia-decap-oauth",
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.access_token) {
              reject(new Error(parsed.error_description || parsed.error || "GitHub did not return an access token"));
              return;
            }
            resolve(parsed.access_token);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function callbackHtml(token) {
  const message = JSON.stringify({ token, provider: "github" });
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Authorizing</title></head>
<body>
<script>
(function(){
  var message = "authorization:github:success:" + ${JSON.stringify(message)};
  function receiveMessage(event) {
    window.opener.postMessage(message, event.origin);
    window.close();
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
Authorizing with GitHub...
</body></html>`;
}

function errorHtml(error) {
  const message = JSON.stringify({ error: String(error.message || error) });
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Authorization failed</title></head>
<body>
<script>
(function(){
  var message = "authorization:github:error:" + ${JSON.stringify(message)};
  function receiveMessage(event) {
    window.opener.postMessage(message, event.origin);
    window.close();
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
GitHub authorization failed: ${escapeHtml(error.message || error)}
</body></html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok\n");
    return;
  }

  if (url.pathname === "/admin/oauth/auth" || url.pathname === "/auth") {
    const state = crypto.randomBytes(16).toString("hex");
    const github = new URL("https://github.com/login/oauth/authorize");
    github.searchParams.set("client_id", clientId);
    github.searchParams.set("redirect_uri", redirectUri);
    github.searchParams.set("scope", scope);
    github.searchParams.set("state", state);
    res.writeHead(302, {
      "Location": github.toString(),
      "Set-Cookie": `oauth_state=${state}; Path=/admin/oauth; HttpOnly; Secure; SameSite=Lax`,
      "Cache-Control": "no-store",
    });
    res.end();
    return;
  }

  if (url.pathname === "/admin/oauth/callback" || url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookie = req.headers.cookie || "";
    const expected = /(?:^|;\s*)oauth_state=([^;]+)/.exec(cookie);
    if (!code) {
      send(res, 400, errorHtml(new Error("Missing GitHub OAuth code")));
      return;
    }
    if (!expected || expected[1] !== state) {
      send(res, 400, errorHtml(new Error("Invalid GitHub OAuth state")));
      return;
    }
    try {
      const token = await exchangeCode(code);
      send(res, 200, callbackHtml(token), {
        "Set-Cookie": "oauth_state=; Path=/admin/oauth; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
      });
    } catch (error) {
      send(res, 500, errorHtml(error));
    }
    return;
  }

  send(res, 404, "Not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Decap GitHub OAuth proxy listening on 127.0.0.1:${port}`);
});

