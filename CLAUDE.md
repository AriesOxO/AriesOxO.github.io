# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal technical blog (AriesOxO.github.io) built with Jekyll using the [jekyll-TeXt-theme](https://github.com/kitian616/jekyll-TeXt-theme). It's hosted on GitHub Pages and primarily contains Chinese-language technical articles covering Java, Spring Boot, MySQL, Docker, etc.

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

## Commit Message Convention

Commits are enforced by commitlint (via Husky). Format: `type: subject` (max 72 chars)

Valid types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `improvement`, `perf`, `refactor`, `release`, `revert`, `style`, `test`

- Type must be lowercase
- Subject must not be empty, not end with a period, not be sentence/pascal/upper case

## Architecture

### Template Hierarchy
- `_layouts/base.html` — root layout wrapping all pages
- Specific layouts (`home`, `article`, `articles`, `archive`, `page`, `landing`) extend `base.html`
- `_includes/` contains reusable partials: `header.html`, `footer.html`, `sidebar/`, `article/`, `scripts/`

### Styles
- Entry point: `assets/css/main.scss`
- `_sass/` follows SMACSS: `common/`, `layout/`, `components/`, `skins/`, `animate/`, `additional/`
- Custom overrides go in `_sass/custom.scss`
- Active skin: `forest`; active highlight theme: `tomorrow-night-blue`

### JavaScript
- `_includes/scripts/` contains page-level JS (`common.js`, `article.js`, `home.js`, etc.) and component scripts under `components/`
- `live2dw/` contains the Live2D virtual character widget (model: hijiki)

### Data Files
- `_data/navigation.yml` — site navigation menu
- `_data/variables.yml` — CDN source URLs for third-party libs
- `_data/locale.yml` — i18n strings
- `_data/authors.yml` — author profiles

## Key Configuration (_config.yml)

- `text_skin: forest` — theme skin
- `highlight_theme: tomorrow-night-blue` — code highlight style
- `lang: zh`, `timezone: Asia/Shanghai`
- `paginate: 8` — posts per page
- `mathjax: true`, `mermaid: true`, `chart: true` — Markdown enhancements enabled
- `comments.provider: false` — comments currently disabled (Gitalk config present but inactive)
- `permalink: date` — URL format

## Deployment

GitHub Actions (`.github/workflows/jekyll.yml`) automatically builds and deploys to GitHub Pages on push to `master`.
