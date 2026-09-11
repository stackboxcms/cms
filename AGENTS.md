# @stackbox/cms — agent instructions

Stackbox is a code-first CMS that assembles TypeScript into a **fetch-handler-compatible server**. Use these conventions when building or extending a site.

## Site conventions

| Primitive | Factory | Purpose |
| --- | --- | --- |
| Site config | `createSiteConfig(config)` | Definition-time settings shared by templates and pages |
| Site | `createSite(siteConfig, { pages })` | Runtime router with `fetch(request, env)` |
| Template | `createTemplate({ siteConfig, slots, render })` | Reusable layout with named slots |
| Page | `createPage(template, { path, title, slots })` | A single URL built from a template + slot content |
| Block | `createBlock({ name, render })` | A content block placed into a slot at request time |

**Project layout:**

```
site.config.ts       # createSiteConfig
server.ts            # createSite(...) — default export is the fetch handler
templates/           # shared createTemplate() layouts
pages/               # createPage() per route or feature
content/             # markdown or other bundle-time content (per feature)
```

The default export from `server.ts` implements `fetch(request, env)` and returns a `Response`. It works on Cloudflare Workers, Bun, Deno, and any runtime that speaks the fetch-handler pattern.

## Plugins vs blocks

- **Plugin** — a packaged use-case under `@stackbox/cms/plugins/<name>` (e.g. blog). May export factories, content objects, blocks, types, and helpers.
- **Block** — a core primitive via `createBlock()`. Renders HTML into a template slot. Usable inside or outside plugins.

Slot content is `Block | string`. Plugin content arrays can interleave blocks and HTML strings.

## Plugin catalog

Before implementing a use-case (blog, newsletter, docs, …), check this table. If the user's request matches a row, **read only that plugin's AGENTS.md** and follow it. Do not invent a parallel implementation.

| Plugin | Import | Read when the user mentions | Instructions |
| --- | --- | --- | --- |
| blog | `@stackbox/cms/plugins/blog` | blog, posts, articles, journal, markdown posts, blog listing, blog page | `src/plugins/blog/AGENTS.md` |
| random-quote | `@stackbox/cms/plugins/random-quote` | random quote, quote of the day, inspirational quote, sidebar quote | `src/plugins/random-quote/AGENTS.md` |

When adding a new plugin to this package, add a row here and create `src/plugins/<name>/AGENTS.md` using the same heading structure as the blog plugin. Document all export kinds (factory, types, blocks, helpers).

## Plugin public assets

Runtime files that must be **publicly available** (images, CSS, fonts, JSON served over HTTP) go in:

```
src/plugins/<name>/public_assets/
```

**Opt-in:** only plugins with a `public_assets/` folder get copied at build time. Do not edit the copy script when adding files.

Build copies each `public_assets/` folder to:

- `dist/public/_sb/plugins/<name>/` — served at `/_sb/plugins/<name>/...`
- `dist/plugins/<name>/public_assets/` — so `import "./public_assets/..." with { type: "json" }` works in compiled JS

Use `pluginAssetPath()` from `@stackbox/cms/link` for `<img src>`, `<link href>`, etc. Do not put site files under `/_sb/` — that prefix is reserved for Stackbox plugin assets.

```ts
import { pluginAssetPath } from "@stackbox/cms/link";

pluginAssetPath("random-quote", "photo.jpg");
// → "/_sb/plugins/random-quote/photo.jpg"
```

For data bundled into JS at build time, import from `./public_assets/...` in the plugin's `index.ts`.

## For site agents

If you are working in a **consumer site repo** (not this package), read this file from the installed package:

```
node_modules/@stackbox/cms/AGENTS.md
```

Recommended snippet for the site's own `AGENTS.md`:

```md
This site uses @stackbox/cms. Before adding features, read
`node_modules/@stackbox/cms/AGENTS.md` and follow its plugin catalog.
Do not reimplement bundled plugins.
```

When a request matches a catalog row, open **only** that plugin's instructions file (e.g. `node_modules/@stackbox/cms/src/plugins/blog/AGENTS.md`).
