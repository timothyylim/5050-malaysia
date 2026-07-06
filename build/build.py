#!/usr/bin/env python3
"""Build the local 50-50 Malaysia static site from scraped data.json + faq.json.
Output -> ../site/. Run: python3 build.py"""
import json, os, re, html, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.abspath(os.path.join(HERE, "..", "site"))
data = json.load(open(os.path.join(HERE, "data.json"), encoding="utf-8"))
faq  = json.load(open(os.path.join(HERE, "faq.json"), encoding="utf-8"))
profiles   = sorted(data["profiles"], key=lambda p: p["name"].lower())
industries = sorted(data["industries"], key=lambda i: i["name"].lower())
ind_by_slug = {i["slug"]: i for i in industries}

# ---- CONFIG: replace with the real Google Form link from Tashny ----
FORM_URL = "https://forms.gle/REPLACE-WITH-REAL-SIGNUP-FORM"
CONTACT  = "fiftyfiftymalaysia@gmail.com"
TOTAL    = len(profiles)

FOUNDERS = [
    ("Tashny Sukumaran",
     "Tashny is a human rights researcher and consultant based in Kuala Lumpur, Malaysia. "
     "Her research areas include labour, migration, and sustainable development. She was previously "
     "the South China Morning Post’s Malaysia Correspondent and a Senior Analyst at Malaysia’s "
     "Institute of Strategic and International Studies. Tashny is the founder of 50-50 Malaysia.",
     "Twitter @tashny · Instagram @_tashny"),
    ("Ash Menon",
     "Web developer, Twitter enthusiast, and an infinite fount of bad puns and useless trivia. "
     "Also a vampire, but only on Thursdays. Once randomly showed up on a Japanese television program. "
     "In a pre-pandemic world, he enjoyed travelling the world. These days he plays video games and "
     "takes way too many pictures of his cat.",
     "Twitter @ashvinmenon · Instagram @ashvinmenon"),
    ("Vimal Kumar",
     "In 2017, Vimal decided to jump off the corporate cliff. He is still in the midst of building his "
     "parachute on the way down. E-commerce, logistics, aviation, and entrepreneurship are all under his "
     "belt, although these days his main endeavour is putting clean energy into action. He occasionally "
     "joins 21 other men running around a rectangle chasing after one ball.",
     "Twitter @vimkumar11 · Instagram @vimkumar11"),
]

def e(s): return html.escape(s or "", quote=True)
def initials(n):
    parts = [w for w in re.split(r"\s+", n) if w]
    return "".join(w[0] for w in parts[:2]).upper()

def linkify(t):
    t = e(t)
    t = re.sub(r"(https?://[^\s]+)", r'<a href="\1" target="_blank" rel="noopener">\1</a>', t)
    t = t.replace(CONTACT, f'<a href="mailto:{CONTACT}">{CONTACT}</a>')
    return t

def head(title, depth, desc, active=""):
    p = "../" if depth else ""
    links = [("Browse experts", p+"index.html#browse", "browse"),
             ("Industries", p+"industries.html", "industries"),
             ("About", p+"about.html", "about"),
             ("FAQs", p+"faq.html", "faq")]
    nav = "".join(
        f'<a href="{href}" class="{ "active" if key==active else "" }">{e(label)}</a>'
        for label,href,key in links)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="icon" href="{p}assets/favicon-32.png">
<link rel="stylesheet" href="{p}assets/site.css">
</head>
<body>
<div class="wrap">
  <nav class="site">
    <a class="logo" href="{p}index.html"><img src="{p}assets/logo.svg" alt="50-50 Malaysia"></a>
    <div class="nav-links">{nav}<a class="btn" href="{FORM_URL}" target="_blank" rel="noopener">Join the database</a></div>
  </nav>
</div>
"""

def foot(depth):
    p = "../" if depth else ""
    return f"""
<div class="wrap"><footer class="site">
  <div><img src="{p}assets/logo.svg" alt="50-50 Malaysia"></div>
  <div>Amplifying women’s voices in Malaysian public discourse.</div>
  <div class="links">
    <a href="{p}index.html">Search</a>
    <a href="{p}industries.html">Industries</a>
    <a href="{p}about.html">About</a>
    <a href="{p}faq.html">FAQs</a>
    <a href="mailto:{CONTACT}">Contact</a>
  </div>
</footer>
<p class="muted" style="text-align:center;font-size:12px;padding:0 0 30px">Local rebuild for 50-50 Malaysia · founded by Tashny Sukumaran, Vimal Kumar &amp; Ash Menon.</p>
</div>
</body></html>"""

def person_card(p, depth):
    prefix = "../" if depth else ""
    href = f"{prefix}profiles/{p['slug']}.html"
    tags = "".join(f'<span class="tag">{e(i["name"])}</span>' for i in p["industries"][:3])
    role = f'<div class="role">{e(p["role"])}</div>' if p.get("role") else ""
    return (f'<a class="person" href="{href}">'
            f'<div class="avatar">{e(initials(p["name"]))}</div>'
            f'<h3>{e(p["name"])}</h3>{role}'
            f'<div class="tags">{tags}</div></a>')

# ---------- HOME ----------
def build_home():
    top = sorted(industries, key=lambda i:-i["count"])[:9]
    ind_cards = "".join(
        f'<a class="ind-card" href="industries/{i["slug"]}.html"><h3>{e(i["name"])}</h3>'
        f'<span class="count">{i["count"]}</span></a>' for i in top)
    h = head("50-50 Malaysia — A directory of women experts", 0,
             "Search Malaysia's directory of women experts across 33 fields — free to use.", "browse")
    h += f"""
<div class="wrap">
  <header class="hero">
    <div class="pill">\U0001F1F2\U0001F1FE <span>A directory of <b>women experts</b> across Malaysia</span></div>
    <h1 class="big">Find a woman expert on <span class="g">any topic.</span></h1>
    <p class="lede">Journalists, event organisers and policymakers use 50-50 Malaysia to find qualified women to quote, invite and consult — in seconds.</p>
    <div class="searchbar">
      <input id="q" type="search" autocomplete="off" placeholder="Try &ldquo;climate&rdquo;, &ldquo;labour law&rdquo;, &ldquo;psychology&rdquo;…">
    </div>
    <p class="hint">Free to use · No account needed · {TOTAL} experts across {len(industries)} industries</p>
    <div class="stats">
      <div><b>{TOTAL}</b><span>women experts</span></div>
      <div><b>{len(industries)}</b><span>industries</span></div>
      <div><b>100%</b><span>women-led</span></div>
    </div>
  </header>
</div>

<section id="browse"><div class="wrap">
  <p class="count-note" id="countNote" style="text-align:center;margin-bottom:18px"></p>
  <div id="results" class="people" style="display:none"></div>
  <div id="browseBlock">
    <div class="sec-title"><h2>Browse by industry</h2><p>Every field where Malaysia needs more women in the room.</p></div>
    <div class="ind-grid">{ind_cards}</div>
    <p style="text-align:center;margin-top:26px"><a class="btn ghost" href="industries.html">View all {len(industries)} industries →</a></p>
  </div>
</div></section>

<section style="padding-top:0"><div class="wrap"><div class="join">
  <h2>Are you an expert in your field?</h2>
  <p>Add yourself to the database in a few minutes. One short form — that’s it. The site is updated every two months.</p>
  <a class="btn" href="{FORM_URL}" target="_blank" rel="noopener">Sign up via Google Form →</a>
</div></div></section>
"""
    h += foot(0).replace("</body>", '<script src="assets/search.js"></script></body>')
    open(os.path.join(OUT,"index.html"),"w",encoding="utf-8").write(h)

# ---------- INDUSTRIES INDEX ----------
def build_industries_index():
    cards = "".join(
        f'<a class="ind-card" href="industries/{i["slug"]}.html"><h3>{e(i["name"])}</h3>'
        f'<span class="count">{i["count"]}</span></a>' for i in industries)
    h = head("Industries — 50-50 Malaysia", 0, "Browse women experts by industry.", "industries")
    h += f"""
<div class="wrap">
  <div class="page-head"><h1>Browse by industry</h1>
    <p class="muted">{TOTAL} women experts across {len(industries)} industries. Pick a field to see who’s listed.</p></div>
  <section style="padding-top:30px"><div class="ind-grid">{cards}</div></section>
</div>"""
    h += foot(0)
    open(os.path.join(OUT,"industries.html"),"w",encoding="utf-8").write(h)

# ---------- PER-INDUSTRY ----------
def build_industry_pages():
    for ind in industries:
        people = [p for p in profiles if any(x["slug"]==ind["slug"] for x in p["industries"])]
        cards = "".join(person_card(p,1) for p in people) or '<div class="empty">No experts listed yet.</div>'
        h = head(f'{ind["name"]} experts — 50-50 Malaysia', 1,
                 f'Women experts in {ind["name"]} in Malaysia.', "industries")
        h += f"""
<div class="wrap">
  <div class="page-head">
    <div class="crumb"><a href="../industries.html">Industries</a> / {e(ind["name"])}</div>
    <h1>{e(ind["name"])}</h1>
    <p class="muted">{len(people)} expert{'' if len(people)==1 else 's'} listed.</p>
  </div>
  <section style="padding-top:26px"><div class="people">{cards}</div></section>
</div>"""
        h += foot(1)
        open(os.path.join(OUT,"industries",ind["slug"]+".html"),"w",encoding="utf-8").write(h)

# ---------- PER-PROFILE ----------
def build_profile_pages():
    for p in profiles:
        ind_links = " ".join(
            f'<a class="tag" href="../industries/{i["slug"]}.html">{e(i["name"])}</a>'
            for i in p["industries"])
        fields = f'<div class="field"><div class="label">Industries</div><div class="value"><div class="tags">{ind_links}</div></div></div>'
        if p.get("role"):
            fields += f'<div class="field"><div class="label">Role &amp; Organisation</div><div class="value">{e(p["role"])}</div></div>'
        if p.get("specialisation"):
            fields += f'<div class="field"><div class="label">Specialisation</div><div class="value">{e(p["specialisation"])}</div></div>'
        if p.get("email"):
            fields += f'<div class="field"><div class="label">Email</div><div class="value"><a href="mailto:{e(p["email"])}">{e(p["email"])}</a></div></div>'
        if p.get("phone"):
            fields += f'<div class="field"><div class="label">Phone</div><div class="value">{e(p["phone"])}</div></div>'
        h = head(f'{p["name"]} — 50-50 Malaysia', 1,
                 f'{p["name"]}: {p.get("role","")}', "browse")
        h += f"""
<div class="wrap">
  <div class="page-head">
    <div class="crumb"><a href="../index.html">Experts</a> / {e(p["name"])}</div>
    <div style="display:flex;align-items:center;gap:16px">
      <div class="avatar" style="width:60px;height:60px;font-size:22px;border-radius:16px">{e(initials(p["name"]))}</div>
      <h1>{e(p["name"])}</h1>
    </div>
  </div>
  <section style="padding-top:24px"><div class="detail">{fields}</div>
    <p style="margin-top:30px"><a class="btn ghost" href="../index.html">← Back to search</a></p>
  </section>
</div>"""
        h += foot(1)
        open(os.path.join(OUT,"profiles",p["slug"]+".html"),"w",encoding="utf-8").write(h)

# ---------- ABOUT ----------
def build_about():
    bios = ""
    for name,bio,social in FOUNDERS:
        bios += f'<h3>{e(name)}</h3><p>{e(bio)}</p><p class="muted" style="font-size:14px">{e(social)}</p>'
    h = head("About — 50-50 Malaysia", 0, "About 50-50 Malaysia and its founders.", "about")
    h += f"""
<div class="wrap">
  <div class="page-head"><h1>About us</h1></div>
  <section style="padding-top:20px"><div class="prose">
    <p>50-50 Malaysia is a volunteer-driven initiative spotlighting women experts across {len(industries)} industries and tackling under-representation head-on. We list women experts, their specialisations, and how to reach them — so there’s no excuse for a lack of gender balance in panels, forums and news coverage.</p>
    {bios}
    <p style="margin-top:24px"><a class="btn" href="{FORM_URL}" target="_blank" rel="noopener">Join the database →</a></p>
  </div></section>
</div>"""
    h += foot(0)
    open(os.path.join(OUT,"about.html"),"w",encoding="utf-8").write(h)

# ---------- FAQ ----------
def build_faq():
    items = ""
    for x in faq:
        a = linkify(x["a"])
        # the "listed" question: wire a real CTA in place of the broken "here"
        if "would like to be listed" in x["q"].lower():
            a = a.replace("you can fill out here",
                          f'you can <a href="{FORM_URL}" target="_blank" rel="noopener">fill out here</a>')
        items += f'<h3>{e(x["q"])}</h3><p>{a}</p>'
    h = head("FAQs — 50-50 Malaysia", 0, "Frequently asked questions about 50-50 Malaysia.", "faq")
    h += f"""
<div class="wrap">
  <div class="page-head"><h1>FAQs</h1></div>
  <section style="padding-top:20px"><div class="prose">{items}
    <p style="margin-top:24px"><a class="btn" href="{FORM_URL}" target="_blank" rel="noopener">Join the database →</a></p>
  </div></section>
</div>"""
    h += foot(0)
    open(os.path.join(OUT,"faq.html"),"w",encoding="utf-8").write(h)

def build_assets():
    shutil.copy(os.path.join(HERE,"site.css"), os.path.join(OUT,"assets","site.css"))
    shutil.copy(os.path.join(HERE,"search.js"), os.path.join(OUT,"assets","search.js"))
    # client search data: trim to needed fields
    slim = {"profiles":[{"slug":p["slug"],"name":p["name"],"role":p.get("role",""),
             "specialisation":p.get("specialisation",""),
             "industries":[{"slug":i["slug"],"name":i["name"]} for i in p["industries"]]}
            for p in profiles]}
    json.dump(slim, open(os.path.join(OUT,"assets","data.json"),"w",encoding="utf-8"),
              ensure_ascii=False, separators=(",",":"))

if __name__ == "__main__":
    for d in ["", "industries", "profiles", "assets"]:
        os.makedirs(os.path.join(OUT,d), exist_ok=True)
    build_assets()
    build_home(); build_industries_index(); build_industry_pages()
    build_profile_pages(); build_about(); build_faq()
    n = sum(len(files) for _,_,files in os.walk(OUT))
    print(f"Built {n} files into {OUT}")
    print(f"  index.html, industries.html, about.html, faq.html")
    print(f"  {len(industries)} industry pages, {len(profiles)} profile pages")
