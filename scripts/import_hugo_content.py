#!/usr/bin/env python3
"""One-time importer from scraped JSON into Hugo content files.

After this runs, content/ becomes the source of truth. Re-running with --force
will overwrite editor changes made through Decap or GitHub.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
CONTENT = ROOT / "content"
DATA = ROOT / "data"

CONTACT = "fiftyfiftymalaysia@gmail.com"
FORM_URL = "https://forms.gle/REPLACE-WITH-REAL-SIGNUP-FORM"

FOUNDERS = [
    (
        "Tashny Sukumaran",
        "Tashny is a human rights researcher and consultant based in Kuala Lumpur, Malaysia. "
        "Her research areas include labour, migration, and sustainable development. She was previously "
        "the South China Morning Post's Malaysia Correspondent and a Senior Analyst at Malaysia's "
        "Institute of Strategic and International Studies. Tashny is the founder of 50-50 Malaysia.",
        "Twitter @tashny · Instagram @_tashny",
    ),
    (
        "Ash Menon",
        "Web developer, Twitter enthusiast, and an infinite fount of bad puns and useless trivia. "
        "Also a vampire, but only on Thursdays. Once randomly showed up on a Japanese television program. "
        "In a pre-pandemic world, he enjoyed travelling the world. These days he plays video games and "
        "takes way too many pictures of his cat.",
        "Twitter @ashvinmenon · Instagram @ashvinmenon",
    ),
    (
        "Vimal Kumar",
        "In 2017, Vimal decided to jump off the corporate cliff. He is still in the midst of building his "
        "parachute on the way down. E-commerce, logistics, aviation, and entrepreneurship are all under his "
        "belt, although these days his main endeavour is putting clean energy into action. He occasionally "
        "joins 21 other men running around a rectangle chasing after one ball.",
        "Twitter @vimkumar11 · Instagram @vimkumar11",
    ),
]


def q(value: str) -> str:
    return json.dumps(value or "", ensure_ascii=False)


def scalar(name: str, value: str | int | bool) -> str:
    if isinstance(value, bool):
        rendered = "true" if value else "false"
    elif isinstance(value, int):
        rendered = str(value)
    else:
        rendered = q(value)
    return f"{name}: {rendered}\n"


def string_list(name: str, values: list[str]) -> str:
    lines = [f"{name}:\n"]
    if not values:
        lines.append("  []\n")
    else:
        for value in values:
            lines.append(f"  - {q(value)}\n")
    return "".join(lines)


def block_list(name: str, rows: list[dict[str, str]]) -> str:
    lines = [f"{name}:\n"]
    for row in rows:
        lines.append("  -\n")
        for key, value in row.items():
            lines.append(f"    {key}: {q(value)}\n")
    return "".join(lines)


def frontmatter(fields: str, body: str = "") -> str:
    return f"---\n{fields}---\n{body.strip()}\n"


def clean_md(text: str) -> str:
    text = text.replace(CONTACT, f"[{CONTACT}](mailto:{CONTACT})")
    text = re.sub(r"\bGoogle Form you can fill out here\b", f"[Google Form]({FORM_URL}) you can fill out", text)
    return text


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="overwrite existing generated Hugo content")
    args = parser.parse_args()

    profiles_dir = CONTENT / "profiles"
    industries_dir = CONTENT / "industries"
    if (profiles_dir.exists() or industries_dir.exists()) and not args.force:
        raise SystemExit("content/profiles or content/industries already exists; pass --force to overwrite")

    data = json.loads((BUILD / "data.json").read_text(encoding="utf-8"))
    faq = json.loads((BUILD / "faq.json").read_text(encoding="utf-8"))
    profiles = sorted(data["profiles"], key=lambda item: item["name"].lower())
    industries = sorted(data["industries"], key=lambda item: item["name"].lower())

    for path in [profiles_dir, industries_dir]:
        if path.exists():
            shutil.rmtree(path)
        path.mkdir(parents=True)

    DATA.mkdir(exist_ok=True)
    write(DATA / "industries.json", json.dumps(industries, ensure_ascii=False, indent=2) + "\n")

    write(
        industries_dir / "_index.md",
        frontmatter(
            scalar("title", "Industries")
            + scalar("description", "Browse women experts in Malaysia by industry.")
            + scalar("layout", "industries-list")
        ),
    )

    for industry in industries:
        fields = (
            scalar("title", industry["name"])
            + scalar("slug", industry["slug"])
            + scalar("layout", "industry")
            + scalar("description", f"Women experts in {industry['name']} in Malaysia.")
            + scalar("count", industry["count"])
        )
        write(industries_dir / f"{industry['slug']}.md", frontmatter(fields))

    write(
        profiles_dir / "_index.md",
        frontmatter(
            scalar("title", "Experts")
            + scalar("description", "Browse all women experts listed in 50-50 Malaysia.")
        ),
    )

    for profile in profiles:
        fields = (
            scalar("title", profile["name"])
            + scalar("slug", profile["slug"])
            + string_list("industries", [industry["slug"] for industry in profile["industries"]])
            + scalar("role", profile.get("role", ""))
            + scalar("specialisation", profile.get("specialisation", ""))
            + scalar("email", profile.get("email", ""))
            + scalar("phone", profile.get("phone", ""))
            + scalar("draft", False)
        )
        write(profiles_dir / f"{profile['slug']}.md", frontmatter(fields))

    founder_rows = [{"name": name, "bio": bio, "social": social} for name, bio, social in FOUNDERS]
    about_fields = (
        scalar("title", "About us")
        + scalar("description", "About 50-50 Malaysia and its founders.")
        + block_list("founders", founder_rows)
    )
    about_body = (
        "50-50 Malaysia is a volunteer-driven initiative spotlighting women experts across Malaysian "
        "public discourse and tackling under-representation head-on. We list women experts, their "
        "specialisations, and how to reach them so there is no excuse for a lack of gender balance "
        "in panels, forums, and news coverage."
    )
    write(CONTENT / "about.md", frontmatter(about_fields, about_body))

    faq_fields = (
        scalar("title", "FAQs")
        + scalar("description", "Frequently asked questions about 50-50 Malaysia.")
        + block_list("faqs", [{"question": item["q"], "answer": clean_md(item["a"])} for item in faq])
    )
    write(CONTENT / "faq.md", frontmatter(faq_fields))

    print(f"Imported {len(profiles)} profiles and {len(industries)} industries into content/")


if __name__ == "__main__":
    main()
