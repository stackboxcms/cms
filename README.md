# @stackbox/cms

A small, code-first CMS engine for building dynamic sites behind a standard **fetch handler**. Stackbox is designed to be driven by AI: pages, templates, blocks, and plugins are plain TypeScript files with typed, composable APIs, so an agent can author and assemble a site without a database, admin UI, or hand-written backend.

`createSite()` returns an object with a `fetch(request, env)` method — the same shape used by Cloudflare Workers, Bun, Deno, and other runtimes that serve HTTP via the Fetch API:

```ts
export default {
  fetch(req: Request): Response | Promise<Response> {
    return new Response(...);
  },
};
```

GET/HEAD page renders are cached in memory by default (stale-while-revalidate, single-flight refresh). Set `cache: false` on the site config, a page, or any block on that page to render every request. Plugin routes and plugin assets are always uncached.

## Why this exists

Traditional CMSes assume a human clicking around an admin panel. Stackbox inverts that: a site is TypeScript assembled into a fetch handler. Every primitive (`createSiteConfig`, `createSite`, `createTemplate`, `createPage`, `createBlock`) is a typed factory suited for AI to generate, edit, and validate site content as code — and the same files render dynamically at request time.

## Requirements

- Node.js >= 20

## Installation

```bash
npm install @stackbox/cms
```

## Concepts

| Primitive | Factory | Purpose |
| --- | --- | --- |
| **Site config** | `createSiteConfig(config)` | Definition-time settings shared by templates and pages. |
| **Site** | `createSite(siteConfig, { pages, plugins? })` | Runtime router with `fetch(request, env)` — a fetch-handler-compatible server. |
| **Template** | `createTemplate({ siteConfig, slots, render })` | A reusable page layout that declares named **slots**. |
| **Page** | `createPage(template, { path, title, slots })` | A single URL, built by filling a template's slots with content. |
| **Block** | `createBlock({ name, render })` | A self-contained content block placed into a slot at request time. |
| **Plugin** | `createPlugin({ name, description, version, keywords, root })` | A packaged feature. Register it on `createSite({ plugins })` when you use it. |

**Plugins vs blocks:** **Plugins** package whole features (blog, newsletter) — bundled under `@stackbox/cms/plugins/<name>` or a third-party package with the same shape. Each plugin **must** export a `plugin` object from `createPlugin()` (name, description, version, keywords). **Blocks** are the core slot primitive via `createBlock()`; plugins can ship blocks alongside other exports.

Importing a plugin does not enable it. Pass `plugin` into `createSite({ plugins })`. Only registered plugins have `public_assets/` served or copied.

**Slots** are named regions in a template. Page content — strings, HTML, or blocks — is dropped into slots, and the engine resolves and renders everything (including async blocks, concurrently) to a single HTML string.

## Page cache

Optional `cache: { min?: number; max?: number } | false` on site config, pages, and blocks (milliseconds). Omit = no opinion; `false` = never cache that request.

```ts
createSiteConfig({
  name: "My Site",
  url: "https://example.com",
  cache: { min: 60_000, max: 7 * 24 * 60 * 60 * 1000 },
});

createPage(template, {
  path: "/live",
  title: "Live",
  cache: false,
  slots: { content: [...] },
});

createBlock({
  name: "ticker",
  cache: { max: 5 * 60 * 1000 },
  render() { ... },
});
```

TTL merges settings from the site config, the page, and on-page blocks: highest `min` floors the result, lowest `max` caps it (default 1 day, hard cap 30 days). Responses include `Cache-Control`. Expired entries are served immediately while one background refresh runs per key.

## Site hooks

Extend rendering at runtime with an optional `hooks` object on `createSite`:

```ts
export default createSite(siteConfig, {
  pages: [homePage],
  hooks: {
    shouldCache(request) {
      return true;
    },
    renderSlotItem(html, info) {
      return html;
    },
    afterRender(html, info) {
      return html;
    },
    beforeResponse(response, info) {
      return response;
    },
  },
});
```

- **`shouldCache(request)`** — return `false` to skip the page cache for that request (page/block TTL still applies when it returns `true`)
- **`renderSlotItem(html, info)`** — transform each slot item after it renders
- **`afterRender(html, info)`** — transform the full page HTML
- **`beforeResponse(response, info)`** — adjust page and 404 responses before they are returned

Pages and blocks may optionally set `source` (for example `import.meta.url`) so hooks can point editors or agents at the defining file.

## Project layout

```
my-site/
  site.config.ts      # createSiteConfig({ name, url, ... })
  server.ts           # createSite(...) — default export is your fetch handler
  templates/
    site-template.ts  # shared createTemplate() layouts
  pages/
    home.ts           # exports homePage
    blog.ts           # createBlog() + createPage() for listing and posts
  content/blog/       # markdown posts (read at bundle time)
```

## Quick start

`site.config.ts`:

```ts
import { createSiteConfig } from "@stackbox/cms";

export default createSiteConfig({
  name: "My Site",
  url: "https://example.com",
});
```

`templates/site-template.ts`:

```ts
import { createTemplate, html } from "@stackbox/cms";
import siteConfig from "../site.config";

export const siteTemplate = createTemplate({
  siteConfig,
  slots: [{ name: "content", options: { required: true, primary: true } }],
  render({ slots }) {
    return html`<main>${slots.content.render()}</main>`;
  },
});
```

`pages/home.ts`:

```ts
import { createPage } from "@stackbox/cms";
import { siteTemplate } from "../templates/site-template";

const homePage = createPage(siteTemplate, {
  path: "/",
  title: "Home",
  slots: { content: ["<p>Welcome to my site.</p>"] },
});

export default homePage;
```

`server.ts`:

```ts
import { createSite } from "@stackbox/cms";
import siteConfig from "./site.config";
import homePage from "./pages/home";
import aboutPage from "./pages/about";

export default createSite(siteConfig, {
  pages: [homePage, aboutPage],
  // plugins: [blogPlugin, randomQuotePlugin], // only plugins this site uses
});
```

The default export implements `fetch(request, env)` and returns a `Response` — drop it into any runtime that speaks the fetch-handler pattern. For example:

- **[Cloudflare Workers](https://developers.cloudflare.com/workers/)** — deploy with [`wrangler`](https://developers.cloudflare.com/workers/wrangler/) (often as `worker.ts`)
- **[Bun](https://bun.sh/docs/api/http#fetch-handler)** — `Bun.serve({ fetch: site.fetch })`
- **[Deno](https://docs.deno.com/runtime/fundamentals/http_server/)** — `Deno.serve(site.fetch)`

## Blog plugin

`createBlog()` loads markdown at bundle time and returns **content objects** you wire into your own pages with `createPage()` — so you control templates, slots, and any extra content alongside blog output.

```ts
// pages/blog.ts
import { join } from "node:path";
import { createPage } from "@stackbox/cms";
import { createBlog } from "@stackbox/cms/plugins/blog";
import { siteTemplate } from "../templates/site-template";

const blog = createBlog({
  contentPath: join(import.meta.dirname, "../content/blog"),
  pathPrefix: "/blog",
  postsPerPage: 10, // optional — omit to put all posts on one listing page
});

export const blogListingPages = blog.listings.map((listing, index) =>
  createPage(siteTemplate, {
    path: listing.path,
    title: index === 0 ? "Blog" : `Blog — page ${index + 1}`,
    slots: {
      content: [...listing.content, "<p>Subscribe for updates</p>"],
    },
  }),
);

export const blogPostPages = blog.posts.map((post) =>
  createPage(siteTemplate, {
    path: post.path,
    title: post.title,
    meta: post.meta,
    slots: { content: [...post.content] },
  }),
);
```

```ts
// server.ts
import blogPlugin from "@stackbox/cms/plugins/blog";
import { blogListingPages, blogPostPages } from "./pages/blog";

export default createSite(siteConfig, {
  pages: [homePage, ...blogListingPages, ...blogPostPages],
  plugins: [blogPlugin],
});
```

## Bundled plugins

**Blog** — content objects wired into pages:

```ts
import blogPlugin, { createBlog } from "@stackbox/cms/plugins/blog";
```

**Random quote** — block-only plugin (drop into any slot):

```ts
import randomQuotePlugin, {
  randomQuoteBlock,
} from "@stackbox/cms/plugins/random-quote";
import myQuotes from "../content/quotes.json" with { type: "json" };

slots: { sidebar: [randomQuoteBlock()] } // bundled quotes
slots: { sidebar: [randomQuoteBlock({ quotes: myQuotes })] } // your own
```

Register every plugin you use:

```ts
export default createSite(siteConfig, {
  pages: [homePage, ...blogListingPages, ...blogPostPages],
  plugins: [blogPlugin, randomQuotePlugin],
});
```

Private plugin files live in `assets/` (imported by JS). Files served over HTTP live in `public_assets/` and are copied or served only for registered plugins — including third-party packages that follow the same layout.

Plugins may also register **`routes`** (served by `fetch()`) and **`build`** hooks (run by `stackbox-cms build`). The **sitemap** plugin uses both to serve and write `/sitemap.xml`:

```ts
import sitemapPlugin from "@stackbox/cms/plugins/sitemap";

export default createSite(siteConfig, {
  pages: [homePage, aboutPage],
  plugins: [sitemapPlugin],
});
```

Run the package build script so registered plugin `public_assets/` land in the site public directory:

```bash
npx stackbox-cms build
# or: npx stackbox-cms build --site server.ts --outDir dist --publicDir dist/public
```

```json
"scripts": {
  "build": "stackbox-cms build"
}
```

## AI agents

Bundled plugins include agent playbooks. See [`dist/AGENTS.md`](dist/AGENTS.md) (generated on `npm run build`) for site conventions and a plugin keyword catalog. When a user asks for a feature (e.g. "add a blog"), read **only** the matching plugin's `AGENTS.md` — do not load every plugin file.

If you are building a site that uses this package, add this to your project's `AGENTS.md`:

```md
This site uses @stackbox/cms. Before adding features, read
`node_modules/@stackbox/cms/dist/AGENTS.md` and follow its plugin catalog.
Do not reimplement bundled plugins.
```

## Development

```bash
npm run build      # compile the package
npm run typecheck  # type-check without emitting
npm test           # build, then run the test suite
```

## License

BSD-3-Clause
