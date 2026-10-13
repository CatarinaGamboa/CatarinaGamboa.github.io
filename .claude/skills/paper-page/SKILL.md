---
name: paper-page
description: Build an interactive project page for one of Catarina's research papers at papers/<name>/ on her GitHub Pages site, following the Barista, ICSE 2023 and PLDI 2025 pages. Use when she asks for a page, project page or website section about a paper.
---

# Paper project page

The existing pages are the reference: `papers/barista/`, `papers/icse23/`, `papers/pldi25/`. Open the one closest to the new paper before starting, and reuse its patterns rather than inventing new ones.

## What Catarina wants from these pages

These come from her feedback on the first three pages:

- **Little text.** One or two sentences per section. A visitor should get the idea from the headings, numbers and the interactive parts alone. Put longer explanations behind a click (`<details>`, a selected item, "next quote").
- **Interactive over prose.** Each section has one thing to click, select or explore, built from the paper's own figures, tables or examples: a state machine (`PaperDFA`), a clickable figure, an IDE mock, a chart with a table view.
- **Highlighted words and icons.** Bold the numbers, use `<mark class="k">` for key terms, and Font Awesome 4 icons (`fa fa-*`) on list items and buttons.
- **No distracting motion.** Render content once and animate only what changes. A demo that re-renders every line and replays the fade-in looks like a bug. Play an animation at most once when it scrolls into view, and respect `prefers-reduced-motion`.
- **Poster in the hero.** The poster sits to the right of the title as a `<button class="poster" data-pdf=...>`. Clicking it opens the zoom viewer (`paper-zoom.js`) and never opens the PDF. The PDF is reachable from the viewer's button and the hero's Poster button.
- **The talk photo goes near the end**, in its own `#talk` section before Cite.
- **Link related pages**, for example the LiquidJava page or the tool's repo, and show what the tool looks like when the paper is about a tool.
- **Paper link:** one publisher DOI (`https://doi.org/...`) is enough.
- **Voice:** plain and specific, like a person explaining their work. Use the paper's exact numbers and never invent results, quotes or participants.

## Inputs to collect

Ask for anything missing instead of guessing:

- the paper PDF (extract it with `pdftotext -layout`), the DOI and the BibTeX;
- the artifact link (Zenodo, figshare or GitHub);
- the poster as a PDF and a PNG or JPG in `assets/images/posters/`;
- a presentation photo, if there is one;
- any award (poster or paper), with its event and year.

## Steps

1. **Plan.** Read the paper and pick 3 to 5 sections. Each section gets one idea, a short heading that says what it shows, and one interactive element. A useful order is: what the thing is, how it works, the evaluation, the talk, Cite. Show the plan to Catarina before building.
2. **Write the sources in the scratchpad**, not the repo:
   - `main.html`: start from `templates/main.html`. Asset paths are written root-relative (`assets/...`, `papers/...`); the build script rewrites them to `../../`. The one exception is the poster's `data-pdf`, which is written `../../assets/...` directly.
   - `page.css`: page-specific styles, scoped under `.pp`. Check `assets/css/paper-page.css` first, since it already has the hero, `.pp-block`, `.prose`, `.chips`, `.chart`, `details.table-view`, `.cite`, `.talk` and the poster viewer.
   - `assets/js/<name>.js` (in the repo): the page script, wrapped in an IIFE with `"use strict"`. The Copy button for the BibTeX (`#copy-bib`) is handled here, as in `pldi25.js`.
3. **Build** from the repo root:
   ```
   python3 -I .claude/skills/paper-page/scripts/make_page.py <scratch>/main.html <scratch>/page.css papers/<name>/index.html "<Title> - <VENUE YEAR> | Catarina Gamboa" <name>.js
   ```
   The script takes the head, navbar and footer from `papers/barista/index.html`. It inlines `page.css` and loads `paper-dfa.js`, `paper-zoom.js` and the page scripts. Rebuild after every change to the sources. After the first release, small fixes can go straight into `papers/<name>/index.html`.
4. **Check.** Serve the repo on :8765 (`python3 -m http.server 8765`). If `playwright-core` is not installed in the scratchpad yet, run `npm i --prefix <scratch>/pw playwright-core` (Chromium is already at `~/.cache/ms-playwright/chromium-1243`). Then:
   ```
   node .claude/skills/paper-page/scripts/check_page.js <scratch>/pw <scratch>/shots /papers/<name>/
   ```
   It must report no errors, no failed requests and no horizontal scroll at 1360 px and 390 px. Then look at every screenshot and fix overlaps, clipped text and empty space.
5. **Preview.** Bundle the page into one file and publish it as an Artifact so Catarina can try it before it goes live:
   ```
   python3 -I .claude/skills/paper-page/scripts/build_artifact.py <name> <scratch>/<name>.html "<Short title>"
   ```
   Iterate on her feedback, rebuilding and republishing to the same file path.
6. **Wire it into the site** once she approves:
   - `projects.html`: in the paper's entry, link the title and add a "Project page" button to `papers/<name>/`.
   - `index.html`: link the paper's title in "Selected papers" and the matching "What I work on" card, if there is one.
   - If the paper had an old page at the root, replace it with a redirect stub like `barista.html`.
7. **Publish** only when she says so: commit to `master` (the site deploys from `master`) and push.

## Files

- `scripts/make_page.py`: builds `papers/<name>/index.html` from the scratchpad sources.
- `scripts/build_artifact.py`: bundles a page into one HTML file with its CSS, JS, images and icon font inlined, for the Artifact preview.
- `scripts/check_page.js`: checks the page at desktop and phone width and saves a screenshot of each section.
- `templates/main.html`: the page skeleton (hero with poster, a section, talk, cite).
- Shared code in the repo: `assets/css/paper-page.css`, `assets/js/paper-dfa.js` (state machines) and `assets/js/paper-zoom.js` (poster viewer).
