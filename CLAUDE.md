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

Posts go in `_posts/` with filename format `YYYY-MM-DD-slug.md`. The `rake post` command auto-generates a file with today's date and basic front matter. All posts default to `layout: article` with TOC, sharing, license, and edit-on-GitHub enabled (set in `_config.yml` defaults).

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
- `_data/navigation.yml` — site navigation menu (includes "开源" entry linking to `/projects.html`)
- `_data/variables.yml` — CDN source URLs for third-party libs
- `_data/locale.yml` — i18n strings
- `_data/authors.yml` — author profiles

### Footer
- Left 25%: moe-counter visitor badge (from `count.getloli.com`)
- Right 75%: author links, copyright, stats (centered)
- Mobile: stacked vertically

## Key Configuration (_config.yml)

- `text_skin: forest` — theme skin
- `highlight_theme: tomorrow-night-blue` — code highlight style
- `lang: zh`, `timezone: Asia/Shanghai`
- `paginate: 8` — posts per page
- `mathjax: true`, `mermaid: true`, `chart: true` — Markdown enhancements enabled
- `comments.provider: custom` — Gitalk comments
- `permalink: date` — URL format
- `collections.projects` — project pages collection with `output: true`

## Deployment

GitHub Actions (`.github/workflows/jekyll.yml`) automatically builds and deploys to GitHub Pages on push to `master`.

## Design Documents

Design docs are in `docs/` (excluded from Jekyll build via `_config.yml`):
- `docs/design/open-source-landing-page.md` — project Landing Page design spec
