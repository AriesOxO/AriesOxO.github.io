# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal technical blog (AriesOxO.github.io) built with Jekyll using the [jekyll-TeXt-theme](https://github.com/kitian616/jekyll-TeXt-theme). It's hosted on GitHub Pages and primarily contains Chinese-language technical articles covering Java, Spring Boot, MySQL, Docker, etc.

The site also includes an **open-source project showcase** system with Landing Page style project pages.

## Common Commands

```bash
# Install dependencies (run once)
bundle install
npm install

# Local development server (recommended)
npm run default        # bundle exec jekyll serve -H 0.0.0.0 -t

# Production build
npm run build          # JEKYLL_ENV=production bundle exec jekyll build

# Lint JavaScript
npm run eslint
npm run eslint-fix

# Lint Sass/SCSS
npm run stylelint
npm run stylelint-fix

# Create a new blog post
rake post title="文章标题"
```

## Creating Blog Posts

Posts go in `_posts/` with filename format `YYYY-MM-DD-english-slug.md`. The slug **must be English** to avoid URL encoding issues (Chinese filenames break GitHub Pages URLs).

The `rake post title="文章标题"` command auto-generates a file, but its template uses `layout: post` which is incorrect — manually change to `layout: article` or simply omit it (the `_config.yml` defaults already set `layout: article` with TOC, sharing, license, and edit-on-GitHub for all posts).

Recommended front matter:
```yaml
---
title: "中文标题"
category: Java
tags: [Spring Boot, MySQL]
---
```

Use `<!--more-->` as the excerpt separator in post content.

## Creating Project Pages

Projects use a Jekyll Collection (`_projects/`). Each project is a single `.md` file that generates a Landing Page with three-column doc layout.

### File structure

```
_projects/
  piz.md                    # Project A
  fnos-fan-control.md       # Project B
_layouts/project.html       # Project layout (Hero + Features + 3-column doc)
_sass/additional/_projects.scss  # All project styles
projects.html               # Project listing page
```

### Adding a new project

1. Create `_projects/project-name.md` with the following front matter:

```yaml
---
layout: project
title: project-name
tagline: "One-line description"
description: "SEO description"
repo: https://github.com/AriesOxO/project-name
status: active              # active | maintained | archived
version: v1.0.0             # fallback, auto-fetched from GitHub API
tags: [Rust, CLI]
color: "#e8590c"            # Theme color for Hero gradient
order: 1                    # Sort order on listing page
features:                   # Feature cards (3-4 recommended)
  - title: Feature Name
    icon: fas fa-rocket     # FontAwesome icon
    excerpt: Description
nav:                        # Left sidebar navigation (maps to H2 headings)
  - title: Section Name     # Must match an H2 in content
    icon: fas fa-download
related_tag: project-name   # Auto-link posts with this tag
---

Markdown content starts here (use H2 for sections, H3 for sub-sections)
```

2. Add images to `assets/images/projects/` if needed
3. The project automatically appears on `/projects.html`

### Three-column doc layout

- **Left sidebar**: H2 chapter navigation with icons, defined via `nav` in front matter (auto-generated from H2 if omitted)
- **Center**: Markdown content
- **Right sidebar**: H3 sub-headings (auto-generated from content)
- Responsive: 3-col > 1200px, 2-col 768-1200px, 1-col < 768px

### Version badge

The Hero version badge auto-fetches the latest release tag from GitHub API. The `version` field in front matter serves as fallback.

## Commit Message Convention

Commits are enforced by commitlint (via Husky). Format: `type: subject` (max 72 chars)

Valid types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `improvement`, `perf`, `refactor`, `release`, `revert`, `style`, `test`

- Type must be lowercase
- Subject must not be empty, not end with a period, not be sentence/pascal/upper case

## Architecture

### Template Hierarchy
- `_layouts/base.html` — root layout wrapping all pages
- Specific layouts (`home`, `article`, `articles`, `archive`, `page`, `landing`, `project`) extend `base.html`
- `_includes/` contains reusable partials: `header.html`, `footer.html`, `sidebar/`, `article/`, `scripts/`

### Collections
- `_projects/` — open-source project pages (output: true, permalink: `/projects/:name/`)

### Styles
- Entry point: `assets/css/main.scss`
- `_sass/` follows SMACSS: `common/`, `layout/`, `components/`, `skins/`, `animate/`, `additional/`
- `_sass/additional/_projects.scss` — project Landing Page and 3-column doc layout styles
- Custom overrides go in `_sass/custom.scss`
- Active skin: `forest`; active highlight theme: `tomorrow-night-blue`

### JavaScript
- `_includes/scripts/` contains page-level JS (`common.js`, `article.js`, `home.js`, etc.) and component scripts under `components/`
- `_layouts/project.html` contains inline JS for: GitHub version fetch, left nav generation/highlighting, right TOC generation, mobile nav toggle
- `live2dw/` contains the Live2D virtual character widget (model: hijiki)

### Data Files
- `_data/navigation.yml` — site navigation (7 items: 博客/归档/开源/摄影/说说/关于/友链)
- `_data/photos.yml` — photography gallery data
- `_data/memos.yml` — memos/说说 data (supports optional `image` field)
- `_data/variables.yml` — CDN source URLs for third-party libs
- `_data/locale.yml` — i18n strings
- `_data/authors.yml` — author profiles

### Pages
- `index.html` — home page with Hero Banner + paginated article list
- `archive.html` — archive with collapsible year sections
- `projects.html` — open source project listing
- `photography.html` — photo gallery with masonry layout + tag filter + Lightbox
- `memos.html` — memos timeline (supports images)
- `about.md` — personal profile page
- `friendLink.html` — friend links

### Footer
- Left 25%: moe-counter visitor badge (from `count.getloli.com`)
- Right 75%: author links, copyright, stats + RSS link (centered)
- Mobile: stacked vertically
- Live2D: shrinks on mobile (80×160), hidden on project doc pages mobile

### SEO
- `url: https://AriesOxO.github.io` — required for correct sitemap/feed/canonical URLs
- Open Graph + Twitter Card meta tags in `_includes/head.html`
- `jekyll-sitemap` plugin generates `/sitemap.xml`
- `jekyll-feed` plugin generates `/feed.xml`

## Key Configuration (_config.yml)

- `text_skin: forest` — theme skin
- `highlight_theme: tomorrow-night-blue` — code highlight style
- `url: https://AriesOxO.github.io` — site URL (critical for SEO)
- `lang: zh`, `timezone: Asia/Shanghai`
- `paginate: 8` — posts per page
- `mathjax: true`, `mermaid: true`, `chart: true` — Markdown enhancements enabled
- `comments.provider: custom` — Gitalk comments
- `permalink: date` — URL format
- `collections.projects` — project pages collection with `output: true`

## Deployment

GitHub Actions (`.github/workflows/jekyll.yml`) automatically builds and deploys to GitHub Pages on push to `master`. CI uses `actions/jekyll-build-pages@v1` (GitHub's official action), not the local `bundle exec jekyll build` — so local build issues don't always reproduce in CI and vice versa.

## Design Documents

Design docs are in `docs/` (excluded from Jekyll build via `_config.yml`):
- `docs/design/blog-overall-design.md` — overall blog design spec (info architecture, 7 pages, roadmap)
- `docs/design/open-source-landing-page.md` — project Landing Page design spec
