# @stackbox/cms

A small, code-first CMS engine for building dynamic [Cloudflare Worker](https://developers.cloudflare.com/workers/) sites. Stackbox is designed to be driven by AI: pages, templates, and content modules are plain TypeScript files with typed, composable APIs, so an agent can author and assemble a site without a database, admin UI, or hand-written backend.

Pages are rendered on each request inside a Cloudflare Worker, so content, templates, and modules can be fully dynamic — driven by request data, bindings (KV, D1, R2), and async data fetching.

## Why this exists

Traditional CMSes assume a human clicking around an admin panel. Stackbox inverts that: a site is TypeScript modules assembled into a Worker. Every primitive (`createSiteConfig`, `createSite`, `createTemplate`, `createPage`, `createModule`) is a typed factory suited for AI to generate, edit, and validate site content as code — and the same files render dynamically on Cloudflare Workers at request time.

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
| **Site** | `createSite(siteConfig, { pages }` | Runtime router with `fetch(request, env)` for Cloudflare Workers. |
| **Template** | `createTemplate({ siteConfig, slots, render }` | A reusable page layout that declares named **slots**. |
| **Page** | `createPage(template, { path, title, slots }` | A single URL, built by filling a template's slots with content. |
| **Module** | `createModule({ name, render }` | A self-contained content block placed into a slot. |

**Slots** are named regions in a template. Page content — strings, HTML, or modules — is dropped into slots, and the engine resolves and renders everything (including `async` modules, concurrently) to a single HTML string.

## Project layout

```
my-worker/
  site.config.ts   # createSiteConfig({ name, url, ... })
  worker.ts        # createSite(siteConfig, { pages }) — default export for Cloudflare
  pages/
    home.ts        # exports homePage
    blog.ts        # createBlog() + createPage() for listing and posts
  content/blog/    # markdown posts (read at bundle time)
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

`pages/home.ts`:

```ts
import { html } from "@hyperspan/html";
import { createPage, createTemplate } from "@stackbox/cms";
import siteConfig from "../site.config.js";

const template = createTemplate({
  siteConfig,
  slots: [{ name: "content", options: { required: true, primary: true } }],
  render({ slots }: { slots: { content: { render: () => unknown } } }): ReturnType<typeof html> {
    return html`<main>${slots.content.render()}</main>`;
  },
});

const homePage = createPage(template, {
  path: "/",
  title: "Home",
  slots: { content: ["<p>Welcome to my site.</p>"] },
});

export default homePage;
```

`worker.ts`:

```ts
import { createSite } from "@stackbox/cms";
import siteConfig from "./site.config.js";
import homePage from "./pages/home.js";
import aboutPage from "./pages/about.js";

export default createSite(siteConfig, {
  pages: [homePage, aboutPage],
});
```

Deploy with [`wrangler`](https://developers.cloudflare.com/workers/wrangler/). The default export's `fetch(request, env)` handles each request.

## Blog module

`createBlog()` loads markdown at bundle time and returns **content objects** you wire into your own pages with `createPage()` — so you control templates, slots, and any extra content alongside blog output.

```ts
// pages/blog.ts
import { join } from "node:path";
import { html } from "@hyperspan/html";
import { createPage, createTemplate } from "@stackbox/cms";
import { createBlog } from "@stackbox/cms/modules/blog";
import siteConfig from "../site.config.js";

const blog = createBlog({
  contentPath: join(import.meta.dirname, "../content/blog"),
  pathPrefix: "/blog",
  postsPerPage: 10, // optional — omit to put all posts on one listing page
});

const listingTemplate = createTemplate({
  siteConfig,
  slots: [{ name: "content", options: { required: true, primary: true } }],
  render({ slots }) {
    return html`<main>${slots.content.render()}</main>`;
  },
});

export const blogListingPages = blog.listings.map((listing, index) =>
  createPage(listingTemplate, {
    path: listing.path,
    title: index === 0 ? "Blog" : `Blog — page ${index + 1}`,
    slots: {
      content: [...listing.content, "<p>Subscribe for updates</p>"],
    },
  }),
);

const postTemplate = createTemplate({ /* ... */ });

export const blogPostPages = blog.posts.map((post) =>
  createPage(postTemplate, {
    path: post.path,
    title: post.title,
    meta: post.meta,
    slots: { content: [...post.content] },
  }),
);
```

```ts
// worker.ts
import { blogListingPages, blogPostPages } from "./pages/blog.js";

export default createSite(siteConfig, {
  pages: [homePage, ...blogListingPages, ...blogPostPages],
});
```

## Bundled modules

```ts
import { createBlog } from "@stackbox/cms/modules/blog";
import heading from "@stackbox/cms/modules/heading";
```

## Development

```bash
npm run build      # compile the package
npm run typecheck  # type-check without emitting
npm test           # build, then run the test suite
```

## License

BSD-3-Clause
