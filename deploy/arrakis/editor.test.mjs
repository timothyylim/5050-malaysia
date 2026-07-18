// Tests for the 50-50 Malaysia editor service (5050-editor-server.js).
//
// Runs the REAL server against an isolated temp copy of the site content, with a
// local *bare* git repo standing in for GitHub — so the full save -> commit ->
// push happy path is exercised end to end without touching the real remote or SSH.
//
//   node --test deploy/arrakis/editor.test.mjs
//
// Zero dependencies, matching the server itself. Requires Node 18+ (global fetch).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const serverJs = path.join(here, "5050-editor-server.js");
const PORT = 8798;
const BASE = `http://127.0.0.1:${PORT}`;

let workDir; // temp root
let sourceDir; // editor SOURCE_DIR (a git working copy with a bare "origin")
let bareDir; // stands in for GitHub
let server; // child process

function git(dir, args) {
  const r = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
}

async function waitForServer(timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/admin/`);
      if (r.ok) return;
    } catch (_) {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("editor server did not start in time");
}

before(async () => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), "5050-editor-test-"));
  sourceDir = path.join(workDir, "src");
  bareDir = path.join(workDir, "origin.git");

  // Isolated content copy: only the two dirs the editor reads/writes.
  fs.mkdirSync(path.join(sourceDir, "content"), { recursive: true });
  fs.cpSync(path.join(repoRoot, "content", "profiles"), path.join(sourceDir, "content", "profiles"), { recursive: true });
  fs.cpSync(path.join(repoRoot, "content", "industries"), path.join(sourceDir, "content", "industries"), { recursive: true });

  // Local bare remote so `git push origin main` succeeds without GitHub/SSH.
  git(workDir, ["init", "--bare", "-b", "main", bareDir]);
  git(sourceDir, ["init", "-b", "main"]);
  git(sourceDir, ["config", "user.name", "Test"]);
  git(sourceDir, ["config", "user.email", "test@example.com"]);
  git(sourceDir, ["add", "-A"]);
  git(sourceDir, ["commit", "-q", "-m", "seed"]);
  git(sourceDir, ["remote", "add", "origin", bareDir]);
  git(sourceDir, ["push", "-q", "origin", "main"]);

  server = spawn("node", [serverJs], {
    env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", SOURCE_DIR: sourceDir },
    stdio: "ignore",
  });
  await waitForServer();
});

after(() => {
  if (server) server.kill();
  if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
});

test("GET /admin/ serves the editor HTML", async () => {
  const r = await fetch(`${BASE}/admin/`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") || "", /text\/html/);
  const html = await r.text();
  assert.match(html, /50-50 Malaysia · Editor/);
  assert.match(html, /Save and publish/);
});

test("GET /admin/api/state lists industries and profiles", async () => {
  const state = await (await fetch(`${BASE}/admin/api/state`)).json();
  assert.ok(Array.isArray(state.industries) && state.industries.length > 0);
  assert.ok(Array.isArray(state.profiles) && state.profiles.length > 0);
  assert.ok(state.profiles.some(p => p.slug === "adhura-husna"));
  assert.ok(state.industries.some(i => i.slug === "human-rights"));
});

test("GET /admin/api/profile returns a known profile's fields", async () => {
  const p = await (await fetch(`${BASE}/admin/api/profile?slug=adhura-husna`)).json();
  assert.equal(p.title, "Adhura Husna");
  assert.ok(p.industries.includes("economics-finance"));
  assert.ok(p.industries.includes("human-rights"));
});

test("GET /admin/api/profile rejects an invalid slug (400)", async () => {
  const r = await fetch(`${BASE}/admin/api/profile?slug=${encodeURIComponent("../../etc/passwd")}`);
  assert.equal(r.status, 400);
});

test("GET /admin/api/profile 404s for a missing profile", async () => {
  const r = await fetch(`${BASE}/admin/api/profile?slug=no-such-person-here`);
  assert.equal(r.status, 404);
});

test("POST rejects a profile with no title (400) and writes nothing", async () => {
  const r = await fetch(`${BASE}/admin/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "should-not-exist", industries: ["human-rights"] }),
  });
  assert.equal(r.status, 400);
  assert.equal(fs.existsSync(path.join(sourceDir, "content", "profiles", "should-not-exist.md")), false);
});

test("POST rejects an unknown industry (400)", async () => {
  const r = await fetch(`${BASE}/admin/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "X", slug: "x-person", industries: ["not-a-real-industry"] }),
  });
  assert.equal(r.status, 400);
});

test("POST creates a profile, writes the file, and pushes to origin", async () => {
  const beforeCount = Number(git(bareDir, ["rev-list", "--count", "main"]));
  const r = await fetch(`${BASE}/admin/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Test Expert",
      slug: "test-expert",
      industries: ["human-rights"],
      role: "Tester",
      specialisation: "QA",
      email: "test@example.com",
      phone: "",
      body: "Notes",
      draft: false,
    }),
  });
  assert.equal(r.status, 200);
  const out = await r.json();
  assert.equal(out.ok, true);
  assert.equal(out.slug, "test-expert");

  // File written with valid front matter
  const file = path.join(sourceDir, "content", "profiles", "test-expert.md");
  assert.ok(fs.existsSync(file));
  const md = fs.readFileSync(file, "utf8");
  assert.match(md, /title: "Test Expert"/);
  assert.match(md, /- "human-rights"/);

  // Round-trips through the read API
  const readBack = await (await fetch(`${BASE}/admin/api/profile?slug=test-expert`)).json();
  assert.equal(readBack.title, "Test Expert");
  assert.equal(readBack.role, "Tester");

  // A commit was actually pushed to the (bare) remote
  const afterCount = Number(git(bareDir, ["rev-list", "--count", "main"]));
  assert.equal(afterCount, beforeCount + 1);
  assert.match(git(bareDir, ["log", "-1", "--pretty=%s"]), /Update expert: Test Expert/);
});

test("POST edits an existing profile and the change round-trips", async () => {
  const r = await fetch(`${BASE}/admin/api/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Adhura Husna",
      slug: "adhura-husna",
      industries: ["human-rights"],
      role: "Updated role",
      specialisation: "x",
      email: "arawiduri@protonmail.com",
      phone: "",
      body: "",
      draft: false,
    }),
  });
  assert.equal(r.status, 200);
  const readBack = await (await fetch(`${BASE}/admin/api/profile?slug=adhura-husna`)).json();
  assert.equal(readBack.role, "Updated role");
});
