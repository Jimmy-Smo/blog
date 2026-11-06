# AGENTS.md

拾雾 (https://jimmy42x.com): a personal Chinese-language blog. Astro 7 static site, Tailwind 4, Pagefind search, served from Cloudflare Workers Static Assets (no adapter, no server code). Most of the repo is Markdown content; the code is a thin rendering layer.

## Commands

```bash
npm run dev            # astro dev; drafts ARE visible here
npm run build          # astro build -> dist/ + Pagefind index; drafts excluded
npm run cf:dev         # wrangler dev against dist/ (run build first)
npm run cf:deploy      # emergency manual deploy only; normal deploy is push to main

npm run post:list                          # all posts with draft/published state
npm run post:new -- <topic/slug> "标题"     # create from content/_template.md
npm run post:publish -- <topic/slug>       # flips draft:false only; date/updated untouched
npm run img -- <topic/slug> <images...>    # resize -> WebP -> upload to R2, record size
```

There is no test suite, linter, or `astro check` setup. `npm run build` is the verification step: it validates every post's frontmatter against the content schema and fails on bad data.

Wrangler commands are prefixed with `env -u all_proxy` because wrangler's undici fails behind the local socks5 proxy. Keep that prefix when adding wrangler calls.

## Architecture

**Content lives outside `src/`.** `src/content.config.ts` defines one `blog` collection whose glob loader points at the repo-root `content/` dir, excluding `_*` templates, `README.md` files, and `content/weekly/` (weekly is not yet a collection). `archive/weekly/` is old notes and is not loaded at all.

- Post ID = path under `content/` without extension (e.g. `java/soap-wsdl-parameter-order`), which becomes the URL `/blog/<id>/`. Subdirectories are for the author's filing only; the site navigates by date, topics (`/topics/<topic>/`), and tags (`/tags/<tag>/`), never by directory. Old shelf-tag URLs are redirected to topic pages in `public/_redirects`.
- `src/lib/posts.ts#getPublishedPosts` is the single gate for drafts: it filters `draft: true` only when `import.meta.env.PROD`. All pages (index, blog, topics, tags, RSS) go through it. Schema default is `draft: true`.
- English versions are a second collection `en` (`content/en/`, same id as the Chinese original, URL `/en/blog/<id>/`, index `/en/`). Only selected posts are translated. UI strings for both languages live in `src/lib/i18n.ts`; `BlogPost.astro` takes `lang` and `hasTranslation`, and the header language switch points to the counterpart page when one exists. Pagefind builds separate indexes per `html[lang]`.
- `STATUS_META` in the same file drives the `evergreen` / `versioned` / `archived` labels and notices shown on posts.
- `BlogPost.astro` links each post to its GitHub source at `content/<id>.md` on `main`, and computes "x 天前" at build time.

**Markdown pipeline** (`astro.config.mjs`), custom rehype plugins in `src/plugins/`:
- `rehype-code-fold`: wraps Shiki code blocks in `div.code-block` with a bar (language, line count, copy button). Blocks of 26+ lines get a ~14-line preview with an expand button, only when JS is on; without JS everything is shown. `text` blocks wrap. Labels switch to English for files under `content/en/`. After changing a rehype plugin, delete `.astro/data-store.json` (and `node_modules/.astro/data-store.json`) or the build reuses cached HTML.
- `rehype-prose-images`: adds `loading=lazy`/`decoding=async` to body `<img>` and `width`/`height` from `src/data/image-sizes.json` (written by `npm run img`) to prevent layout shift.
- `rehype-references`: an `## 参考` / `## 参考资料` section is wrapped in `section.references` and its `ul` becomes a numbered `ol`.
- Shiki uses dual themes with `defaultColor: false` (CSS variables switched in `global.css`).
- `astro-mermaid` renders ```` ```mermaid ```` fences client-side; `autoTheme` follows `html[data-theme]`, which an inline script in `BaseHead.astro` always sets before first paint. Don't hardcode colors in `mermaidConfig.themeVariables`; it is shared by both themes.
- `pagefind()` must stay last in `integrations`; it indexes `dist/*.html` after build. Chrome (header, footer, list pages) is marked `data-pagefind-ignore`.

**Routing/hosting invariants:** `build.format: 'directory'` (trailing-slash URLs) matches Workers' default `auto-trailing-slash`. `site` must stay set or RSS/sitemap fail. `wrangler.jsonc` serves `./dist` with `404-page` handling; don't change `compatibility_date` casually.

## Writing and content rules

From `content/README.md` and `README.md`. Follow these when creating or editing posts:

- Start from `content/_template.md` (prefer `npm run post:new`). Title comes from frontmatter; never write an H1 in the body. Organize with H2/H3 (TOC uses those, shown only when there are ≥2).
- `date` is the article date, maintained by hand and never bumped on publish. `updated` = last substantive revision.
- Classification has two layers. `topic` (required, exactly one): `engineering` `ai` `business` `reading`; Java/JVM posts go under `engineering`. `tags`: English lowercase slugs shown as-is, usually 1–2, may be empty, chosen from the existing list in `content/README.md`. Only add a new tag word if another post on it is clearly coming. No one-off, chapter-name, or person tags.
- Version-sensitive content (versions, products, prices, policy) must state the version or verification date; use `status: versioned` where appropriate.
- Images: upload with `npm run img`, reference the returned `https://img.jimmy42x.com/...` absolute URL. Never commit large images or reference local/desktop paths. Commit the updated `src/data/image-sizes.json`.
- The repo is public, and drafts are public as source files. Never add internal work-project details, real accounts, keys, unredacted data, raw personal retrospectives, or large binaries.
- Prose is Chinese; the author edits for natural, non-AI-sounding prose (see recent `docs(content)` commits).

## Branches and release

See `RELEASING.md`. Work on `dev`, PR `dev → main`; Cloudflare Workers Builds deploys `main` automatically and creates preview URLs for PRs. After merging, merge `origin/main` back into `dev` so `dev` is never behind `main`; never force-reset `dev`. Tags, if any, are bare versions without a `v` prefix (`0.3.0`).

Commit messages: conventional-commit prefix with a Chinese subject, e.g. `feat(markdown): …`, `docs(content): …`, `fix(markdown): …`.
