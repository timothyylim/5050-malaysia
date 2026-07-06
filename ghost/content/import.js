#!/usr/bin/env node
/*
 * 50-50 Malaysia — Ghost content importer.
 * Creates industry tags, expert posts, and the About/FAQ pages from the scraped
 * data in ../../build/. Idempotent-ish: skips items whose slug already exists.
 *
 * Usage:
 *   cp .env.example .env   &&   edit .env   (GHOST_URL + GHOST_ADMIN_KEY)
 *   npm install
 *   node import.js            # create everything
 *   node import.js --dry      # print what would be created, touch nothing
 *
 * Get the Admin API key in Ghost admin: Settings → Advanced → Integrations →
 * Add custom integration → copy the Admin API Key + API URL.
 */
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const build = path.join(__dirname, '..', '..', 'build');
const data = JSON.parse(fs.readFileSync(path.join(build, 'data.json'), 'utf8'));
const faq  = JSON.parse(fs.readFileSync(path.join(build, 'faq.json'), 'utf8'));
const profiles = data.profiles;
const industries = data.industries;

const CONTACT = 'fiftyfiftymalaysia@gmail.com';
const FORM_URL = 'https://forms.gle/REPLACE-WITH-REAL-SIGNUP-FORM';
const EXPERT_TAG = '#expert'; // internal tag => hidden from public tag lists

function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// Build an expert's post body (a single block Ghost keeps as an HTML card).
function profileHtml(p){
  const rows = [];
  if (p.role)           rows.push(field('Role & Organisation', esc(p.role)));
  if (p.specialisation) rows.push(field('Specialisation', esc(p.specialisation)));
  if (p.email)          rows.push(field('Email', `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`));
  if (p.phone)          rows.push(field('Phone', esc(p.phone)));
  return `<div class="detail">${rows.join('')}</div>`;
}
function field(label, value){
  return `<div class="field"><div class="label">${esc(label)}</div><div class="value">${value}</div></div>`;
}

const ABOUT_HTML = `
<p>50-50 Malaysia is a volunteer-driven initiative spotlighting women experts across ${industries.length} industries and tackling under-representation head-on. We list women experts, their specialisations, and how to reach them — so there’s no excuse for a lack of gender balance in panels, forums and news coverage.</p>
<h3>Tashny Sukumaran</h3><p>Tashny is a human rights researcher and consultant based in Kuala Lumpur, Malaysia. Her research areas include labour, migration, and sustainable development. She was previously the South China Morning Post’s Malaysia Correspondent and a Senior Analyst at Malaysia’s Institute of Strategic and International Studies. Tashny is the founder of 50-50 Malaysia.</p>
<h3>Ash Menon</h3><p>Web developer, Twitter enthusiast, and an infinite fount of bad puns and useless trivia. Also a vampire, but only on Thursdays. Once randomly showed up on a Japanese television program. In a pre-pandemic world, he enjoyed travelling the world. These days he plays video games and takes way too many pictures of his cat.</p>
<h3>Vimal Kumar</h3><p>In 2017, Vimal decided to jump off the corporate cliff. He is still in the midst of building his parachute on the way down. E-commerce, logistics, aviation, and entrepreneurship are all under his belt, although these days his main endeavour is putting clean energy into action.</p>`;

function faqHtml(){
  return faq.map(x => {
    let a = esc(x.a).replace(new RegExp(CONTACT,'g'), `<a href="mailto:${CONTACT}">${CONTACT}</a>`);
    if (/would like to be listed/i.test(x.q))
      a = a.replace('you can fill out here', `you can <a href="${FORM_URL}" target="_blank" rel="noopener">fill out here</a>`);
    return `<h3>${esc(x.q)}</h3><p>${a}</p>`;
  }).join('\n');
}

async function main(){
  console.log(`Importer — ${profiles.length} experts, ${industries.length} industries, ${faq.length} FAQs, 3 pages (About, FAQ, Industries).`);
  if (DRY){
    console.log('[dry run] Nothing will be created. Sample expert body:\n');
    console.log(profileHtml(profiles[0]).slice(0, 400));
    return;
  }
  require('dotenv').config();
  const GhostAdminAPI = require('@tryghost/admin-api');
  if (!process.env.GHOST_URL || !process.env.GHOST_ADMIN_KEY){
    console.error('Missing GHOST_URL or GHOST_ADMIN_KEY. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  const api = new GhostAdminAPI({ url: process.env.GHOST_URL, key: process.env.GHOST_ADMIN_KEY, version: 'v5.0' });

  // 1) Industry tags (explicit slugs + descriptions)
  const existingTags = await api.tags.browse({ limit: 'all' });
  const haveTag = new Set(existingTags.map(t => t.slug));
  for (const ind of industries){
    if (haveTag.has(ind.slug)){ console.log(`tag exists: ${ind.slug}`); continue; }
    await api.tags.add({ name: ind.name, slug: ind.slug });
    console.log(`+ tag ${ind.name}`);
  }

  // 2) Expert posts
  const existingPosts = await api.posts.browse({ limit: 'all', fields: 'id,slug' });
  const havePost = new Set(existingPosts.map(p => p.slug));
  let n = 0;
  for (const p of profiles){
    if (havePost.has(p.slug)){ console.log(`post exists: ${p.slug}`); continue; }
    const tags = p.industries.map(i => ({ name: i.name })).concat([{ name: EXPERT_TAG }]);
    await api.posts.add({
      title: p.name, slug: p.slug,
      tags,
      custom_excerpt: (p.role || '').slice(0, 290) || undefined,
      html: profileHtml(p),
      status: 'published',
    }, { source: 'html' });
    n++; if (n % 25 === 0) console.log(`  …${n} experts`);
  }
  console.log(`+ ${n} expert posts`);

  // 3) Pages (About, FAQ, Industries landing)
  const existingPages = await api.pages.browse({ limit: 'all', fields: 'id,slug' });
  const havePage = new Set(existingPages.map(p => p.slug));
  const pages = [
    { title: 'About', slug: 'about', html: ABOUT_HTML },
    { title: 'FAQs', slug: 'faq', html: faqHtml() },
    { title: 'Industries', slug: 'industries', html: '<p>Browse experts by industry.</p>' },
  ];
  for (const pg of pages){
    if (havePage.has(pg.slug)){ console.log(`page exists: ${pg.slug}`); continue; }
    await api.pages.add({ title: pg.title, slug: pg.slug, html: pg.html, status: 'published' }, { source: 'html' });
    console.log(`+ page ${pg.title}`);
  }

  console.log('\nDone. Next: set primary navigation (Browse=/, Industries=/industries/, About=/about/, FAQs=/faq/),');
  console.log('upload routes.yaml (Labs → Routes), and set the Google Form URL in Design → theme settings.');
}

main().catch(e => { console.error(e); process.exit(1); });
