# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Static personal academic website for Catarina Gamboa (PhD student at CMU and University of Lisbon), hosted on GitHub Pages at `CatarinaGamboa.github.io`. There is no build system, static site generator, or package manager — it's plain HTML/CSS/JS served directly.

## Development

To preview locally, serve the root directory with any static file server:
```
python3 -m http.server 8000
```

Push to `master` to deploy via GitHub Pages.

## Architecture

- **Pages**: All top-level `.html` files (`index.html`, `about_me.html`, `projects.html`, `activities.html`, `blog.html`, `liquidjava.html`, etc.) are standalone pages with duplicated navbar and footer markup — there is no templating system.
- **Blog posts**: Live in `blog/` as individual HTML files. They reference assets via `../assets/` relative paths (one level up), unlike root pages which use `assets/`.
- **Styles**: `assets/css/style-starter.css` is the main stylesheet (based on W3Layouts template). `assets/css/style-2.css` is an alternate/older stylesheet.
- **JS**: Bootstrap 4.4.1 (via CDN + local `assets/js/bootstrap.min.js`), jQuery 3.3.1 (local), lightbox plugin, smooth scroll.
- **LiquidJava**: Several pages (`liquidjava.html`, `liquidjava_study1.html`, `liquidjava_study2.html`, `liquidjava_tutorial.html`, now a redirect to the interactive tutorial in the liquid-java org) and VS Code extension files (`assets/liquid-java-*.vsix`) relate to the LiquidJava research project.
- **PDFs**: CV versions at root (`CatarinaGamboa_CV.pdf` is current), papers in `papers/`.
- **Paper pages**: Interactive pages for main papers live in `papers/<name>/index.html` (e.g. `papers/barista/`), built on the site's navbar/footer and referencing assets via `../../`. Shared styles are in `assets/css/paper-page.css` and the reusable state machine component in `assets/js/paper-dfa.js`; page-specific scripts are `assets/js/<name>*.js`. Old root URLs keep a redirect stub (as `barista.html` does).
- **Subdirectories**: `cmupt/`, `docs/`, `presentation/` contain supplementary content.

## Key Conventions

- The navbar is copy-pasted across all pages. When modifying navigation links, update every HTML file.
- Blog posts follow the naming pattern `blog/YYYY-MM-DD-slug.html` and must also be linked from `blog.html`.
- The site uses Font Awesome icons (via class names like `fa fa-*`) and Google Fonts (Nunito, Hind).
