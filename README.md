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

Pages are rendered on each request, so content, templates, blocks, and plugins can be fully dynamic — driven by request data, environment bindings, and async data fetching.

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
| **Site** | `createSite(siteConfig, { pages })` | Runtime router with `fetch(request, env)` — a fetch-handler-compatible server. |
| **Template** | `createTemplate({ siteConfig, slots, render })` | A reusable page layout that declares named **slots**. |
| **Page** | `createPage(template, { path, title, slots })` | A single URL, built by filling a template's slots with content. |
| **Block** | `createBlock({ name, render })` | A self-contained content block placed into a slot at request time. |

**Plugins vs blocks:** **Plugins** package whole features (blog, newsletter) under `@stackbox/cms/plugins/<name>` — they may export factories, content objects, blocks, types, and helpers. **Blocks** are the core slot primitive via `createBlock()`; plugins can ship blocks alongside other exports.

**Slots** are named regions in a template. Page content — strings, HTML, or blocks — is dropped into slots, and the engine resolves and renders everything (including async blocks, concurrently) to a single HTML string.

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
import { blogListingPages, blogPostPages } from "./pages/blog";

export default createSite(siteConfig, {
  pages: [homePage, ...blogListingPages, ...blogPostPages],
});
```

## Bundled plugins

**Blog** — content objects wired into pages:

```ts
import { createBlog } from "@stackbox/cms/plugins/blog";
```

**Random quote** — block-only plugin (drop into any slot):

```ts
import { randomQuoteBlock } from "@stackbox/cms/plugins/random-quote";
import myQuotes from "../content/quotes.json" with { type: "json" };

slots: { sidebar: [randomQuoteBlock()] } // bundled quotes
slots: { sidebar: [randomQuoteBlock({ quotes: myQuotes })] } // your own
```

## AI agents

Bundled plugins include agent playbooks. See [`AGENTS.md`](AGENTS.md) for site conventions and a plugin catalog. When a user asks for a feature (e.g. "add a blog"), read **only** the matching plugin's `AGENTS.md` — do not load every plugin file.

If you are building a site that uses this package, add this to your project's `AGENTS.md`:

```md
This site uses @stackbox/cms. Before adding features, read
`node_modules/@stackbox/cms/AGENTS.md` and follow its plugin catalog.
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
