#!/usr/bin/env node

/*
 * Small, dependency-free editor for 50-50 Malaysia.
 * Caddy protects this service with Basic Auth; this process only listens on
 * localhost. GitHub is used as a hidden backup/source-of-truth via the Arrakis
 * deploy key, so editors never need a GitHub account.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const port = Number(process.env.PORT || 8797);
const sourceDir = process.env.SOURCE_DIR || "/home/tim/5050-malaysia-src";
const profilesDir = path.join(sourceDir, "content", "profiles");
const industriesDir = path.join(sourceDir, "content", "industries");
const sshKey = process.env.GITHUB_DEPLOY_KEY || "/home/tim/.ssh/5050-malaysia-deploy";

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1000000) reject(new Error("Request too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) {
    try { return JSON.parse(trimmed); } catch (_) { return trimmed.slice(1, -1); }
  }
  return trimmed;
}

function parseMarkdown(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Invalid front matter: ${filePath}`);
  const front = {};
  let listKey = null;
  for (const line of match[1].split("\n")) {
    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && listKey) {
      front[listKey] = front[listKey] || [];
      front[listKey].push(unquote(listItem[1]));
      continue;
    }
    const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!field) continue;
    const [, key, value] = field;
    if (value === "") { front[key] = []; listKey = key; }
    else { front[key] = unquote(value); listKey = null; }
  }
  return { front, body: match[2].trimEnd() };
}

function quote(value) { return JSON.stringify(String(value || "")); }

function writeProfile(slug, data) {
  const lines = [
    "---",
    `title: ${quote(data.title)}`,
    `slug: ${quote(slug)}`,
    "industries:",
    ...data.industries.map(industry => `  - ${quote(industry)}`),
    `role: ${quote(data.role)}`,
    `specialisation: ${quote(data.specialisation)}`,
    `email: ${quote(data.email)}`,
    `phone: ${quote(data.phone)}`,
    `draft: ${Boolean(data.draft)}`,
    "---",
    data.body || "",
    "",
  ];
  const target = path.join(profilesDir, `${slug}.md`);
  const temp = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(temp, lines.join("\n"), { mode: 0o640 });
  fs.renameSync(temp, target);
  return target;
}

function git(args) {
  const result = spawnSync("git", ["-C", sourceDir, ...args], {
    encoding: "utf8",
    env: { ...process.env, GIT_SSH_COMMAND: `ssh -i ${sshKey} -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes` },
  });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || "Git command failed").trim());
  return result.stdout.trim();
}

function publish(filePath, title) {
  git(["config", "user.name", "50-50 Malaysia Editor"]);
  git(["config", "user.email", "5050-editor@users.noreply.github.com"]);
  git(["add", filePath]);
  const changed = spawnSync("git", ["-C", sourceDir, "diff", "--cached", "--quiet"], { encoding: "utf8" });
  if (changed.status === 0) return false;
  git(["commit", "-m", `Update expert: ${title}`]);
  git(["push", "origin", "main"]);
  return true;
}

function slugOk(slug) { return typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug); }
function filesIn(dir) { return fs.readdirSync(dir).filter(name => name.endsWith(".md")); }

function state() {
  const industries = filesIn(industriesDir).map(file => {
    const slug = file.slice(0, -3);
    const { front } = parseMarkdown(path.join(industriesDir, file));
    return { slug, title: front.title || slug };
  }).sort((a, b) => a.title.localeCompare(b.title));
  const profiles = filesIn(profilesDir).map(file => {
    const slug = file.slice(0, -3);
    const { front } = parseMarkdown(path.join(profilesDir, file));
    return { slug, title: front.title || slug, role: front.role || "", draft: front.draft === "true" };
  }).sort((a, b) => a.title.localeCompare(b.title));
  return { industries, profiles };
}

const editorHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>50-50 Malaysia · Editor</title><meta name="robots" content="noindex">
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;color:#27273e;background:#f7f7fb;line-height:1.45}*{box-sizing:border-box}body{margin:0}.top{background:#fff;border-bottom:1px solid #e5e5ef;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}.logo{height:34px;width:auto}.top h1{font-size:15px;margin:0;color:#6a6a80;font-weight:500}.shell{max-width:1100px;margin:0 auto;padding:28px 20px 60px}.layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:24px}.panel,.card{background:#fff;border:1px solid #e5e5ef;border-radius:14px;box-shadow:0 8px 28px rgba(42,42,90,.05)}.panel{padding:14px}.panel-head{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 12px}.panel h2{font-size:14px;margin:0}.new{border:0;border-radius:8px;background:#5f5fd3;color:white;padding:8px 11px;font-weight:700;cursor:pointer}.search{width:100%;border:1px solid #ddddec;border-radius:8px;padding:9px 10px;margin-bottom:10px;font:inherit}.items{max-height:65vh;overflow:auto}.item{display:block;width:100%;text-align:left;border:0;background:none;border-radius:8px;padding:10px;cursor:pointer;color:inherit}.item:hover,.item.active{background:#f0f0ff}.item strong{display:block;font-size:14px}.item small{display:block;color:#77778d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card{padding:24px}.card h2{margin:0 0 4px;font-size:22px}.intro{color:#73738a;margin:0 0 22px;font-size:14px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field{margin-bottom:16px}.field.full{grid-column:1/-1}label{display:block;font-size:13px;font-weight:700;margin-bottom:6px}input[type=text],input[type=email],textarea{width:100%;border:1px solid #d9d9e7;border-radius:8px;padding:10px 11px;font:inherit;color:inherit;background:#fff}textarea{min-height:115px;resize:vertical}.hint{font-size:12px;color:#77778d;margin:5px 0 0}.checks{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:7px;border:1px solid #d9d9e7;border-radius:8px;padding:11px;max-height:190px;overflow:auto}.checks label{font-weight:500;margin:0;display:flex;gap:7px;align-items:flex-start}.actions{display:flex;align-items:center;gap:12px;border-top:1px solid #eeeef5;padding-top:18px;margin-top:4px}.save{background:#5f5fd3;color:white;border:0;border-radius:8px;padding:11px 17px;font-weight:700;cursor:pointer}.status{font-size:13px;color:#5f5f76}.empty{padding:48px 16px;text-align:center;color:#77778d}@media(max-width:760px){.layout{grid-template-columns:1fr}.items{max-height:240px}.form-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.top{padding:15px}.shell{padding:18px 12px}}
</style></head><body>
<header class="top"><img class="logo" src="/assets/logo.svg" alt="50-50 Malaysia"><h1>Private editor · expert directory</h1></header>
<main class="shell"><div class="layout"><aside class="panel"><div class="panel-head"><h2>Experts</h2><button class="new" id="new">New expert</button></div><input class="search" id="search" placeholder="Search experts…" autocomplete="off"><div class="items" id="items"></div></aside>
<section class="card"><h2 id="heading">Choose an expert</h2><p class="intro" id="intro">Select a profile to edit it, or create a new expert.</p><form id="form" hidden><div class="form-grid"><div class="field"><label for="title">Name</label><input id="title" required type="text"><p class="hint">The expert's full name.</p></div><div class="field"><label for="slug">Web address</label><input id="slug" required type="text"><p class="hint">Use lowercase words separated by hyphens. Keep unchanged when editing.</p></div><div class="field full"><label>Industries</label><div class="checks" id="industries"></div><p class="hint">Choose every relevant field.</p></div><div class="field"><label for="role">Role &amp; organisation</label><input id="role" type="text"></div><div class="field"><label for="specialisation">Specialisation</label><input id="specialisation" type="text"></div><div class="field"><label for="email">Email</label><input id="email" type="email"></div><div class="field"><label for="phone">Phone</label><input id="phone" type="text"></div><div class="field full"><label for="body">Internal notes</label><textarea id="body"></textarea><p class="hint">Optional notes for the directory team; not shown publicly.</p></div><div class="field full"><label><input id="draft" type="checkbox"> Hide this profile from the public directory</label></div></div><div class="actions"><button class="save" type="submit">Save and publish</button><span class="status" id="status" role="status"></span></div></form></section></div></main>
<script>
const $=id=>document.getElementById(id);let appState={industries:[],profiles:[]};let current=null;
async function api(url,options){const r=await fetch(url,options);const data=await r.json();if(!r.ok)throw new Error(data.error||'Something went wrong');return data}
function renderList(){const q=$('search').value.toLowerCase();$('items').innerHTML='';const matches=appState.profiles.filter(p=>(p.title+' '+p.role).toLowerCase().includes(q));for(const p of matches){const b=document.createElement('button');b.className='item'+(current===p.slug?' active':'');b.innerHTML='<strong>'+esc(p.title)+'</strong><small>'+esc(p.role||'No role added')+'</small>';b.onclick=()=>load(p.slug);$('items').append(b)}if(!matches.length)$('items').innerHTML='<div class="empty">No experts found.</div>'}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderIndustries(selected=[]){$('industries').innerHTML='';for(const i of appState.industries){const l=document.createElement('label');l.innerHTML='<input type="checkbox" value="'+esc(i.slug)+'" '+(selected.includes(i.slug)?'checked':'')+'> '+esc(i.title);$('industries').append(l)}}
function clearForm(){for(const id of ['title','slug','role','specialisation','email','phone','body'])$(id).value='';$('draft').checked=false;renderIndustries([])}
async function load(slug){current=slug;const p=await api('/admin/api/profile?slug='+encodeURIComponent(slug));$('heading').textContent=p.title;$('intro').textContent='Edit this public expert profile, then save your changes.';$('form').hidden=false;for(const id of ['title','slug','role','specialisation','email','phone','body'])$(id).value=p[id]||'';$('draft').checked=!!p.draft;renderIndustries(p.industries||[]);$('status').textContent='';renderList()}
$('new').onclick=()=>{current=null;clearForm();$('heading').textContent='New expert';$('intro').textContent='Add a profile to the directory.';$('form').hidden=false;$('status').textContent='';renderList();$('title').focus()};$('search').oninput=renderList;
$('form').onsubmit=async e=>{e.preventDefault();$('status').textContent='Saving…';const data={title:$('title').value,slug:$('slug').value,industries:[...$('industries').querySelectorAll('input:checked')].map(x=>x.value),role:$('role').value,specialisation:$('specialisation').value,email:$('email').value,phone:$('phone').value,body:$('body').value,draft:$('draft').checked};try{const saved=await api('/admin/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});current=saved.slug;$('status').textContent='Saved. It will be live after the next site build.';appState=await api('/admin/api/state');renderList()}catch(err){$('status').textContent=err.message}};
(async()=>{try{appState=await api('/admin/api/state');renderList()}catch(e){$('items').innerHTML='<div class="empty">Could not load profiles.</div>'}})();
</script></body></html>`;

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin/")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(editorHtml);
    }
    if (req.method === "GET" && url.pathname === "/admin/api/state") return json(res, 200, state());
    if (req.method === "GET" && url.pathname === "/admin/api/profile") {
      const slug = url.searchParams.get("slug") || "";
      if (!slugOk(slug)) return json(res, 400, { error: "Invalid profile address" });
      const file = path.join(profilesDir, `${slug}.md`);
      if (!fs.existsSync(file)) return json(res, 404, { error: "Profile not found" });
      const { front, body } = parseMarkdown(file);
      return json(res, 200, { slug, title: front.title || "", industries: front.industries || [], role: front.role || "", specialisation: front.specialisation || "", email: front.email || "", phone: front.phone || "", draft: front.draft === "true", body });
    }
    if (req.method === "POST" && url.pathname === "/admin/api/profile") {
      const data = JSON.parse(await readBody(req));
      if (!data.title || !slugOk(data.slug)) return json(res, 400, { error: "Name and a valid web address are required" });
      if (!Array.isArray(data.industries) || !data.industries.length || data.industries.some(industry => !slugOk(industry))) return json(res, 400, { error: "Choose at least one valid industry" });
      if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return json(res, 400, { error: "Enter a valid email address" });
      const allowed = new Set(state().industries.map(industry => industry.slug));
      if (data.industries.some(industry => !allowed.has(industry))) return json(res, 400, { error: "One of the selected industries does not exist" });
      const target = writeProfile(data.slug, data);
      publish(path.relative(sourceDir, target), data.title);
      return json(res, 200, { ok: true, slug: data.slug });
    }
    res.writeHead(404); res.end("Not found\n");
  } catch (error) {
    console.error(error);
    json(res, 500, { error: error.message || "Server error" });
  }
}

http.createServer(handler).listen(port, "127.0.0.1", () => console.log(`50-50 editor listening on 127.0.0.1:${port}`));
