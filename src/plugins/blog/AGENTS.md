# Blog plugin — agent playbook

## Use when

The user asks for any of:

- blog, blog page, blog listing, blog posts
- articles, journal, news posts
- markdown posts, writing posts from markdown files
- paginated blog index

## Do not

- Hand-roll a markdown loader or frontmatter parser — use `createBlog()`
- Invent page factories like `createPostPages()` or `createListingPage()` — the API returns **content objects**; you wire them with `createPage()`
- Skip `createPage()` composition — the blog plugin has no template dependency
- Put blog routes only in `server.ts` without a dedicated `pages/blog.ts`

## Exports

- `createBlog()` — factory; returns `{ posts, listings }`
- `BlogPostContent`, `BlogListingContent`, `Blog`, `BlogPost`, `BlogOptions` — types
- `content[]` on post/listing objects accepts **blocks or HTML strings** — optional plugin blocks can be added later (e.g. share buttons)

## API

```ts
import { createBlog } from "@stackbox/cms/plugins/blog";

const blog = createBlog({
  contentPath: string,   // directory of .md files (bundle time)
  pathPrefix: string,    // e.g. "/blog"
  postsPerPage?: number, // optional — omit to put all posts on one listing page
});
```

Returns:

```ts
{
  posts: readonly BlogPostContent[];   // one per markdown file
  listings: readonly BlogListingContent[]; // one or more listing pages
}
```

Each `BlogPostContent`: `{ path, title, meta?, content }` — `content` is slot-ready HTML (or blocks) for the primary slot.

Each `BlogListingContent`: `{ path, content }` — post list HTML for the primary slot.

Listing paths:

- Page 1: `pathPrefix` (normalized, no trailing slash)
- Page 2+: `{pathPrefix}/page/2`, `{pathPrefix}/page/3`, …

Post paths: `{pathPrefix}/{slug}` where slug comes from frontmatter or filename.

## Files to create or update

| File | Action |
| --- | --- |
| `content/blog/*.md` | Create markdown posts with frontmatter |
| `pages/blog.ts` | Call `createBlog()`, map `listings` and `posts` to `createPage()` |
| `server.ts` | Register `...blogListingPages` and `...blogPostPages` in `createSite({ pages })` |
| `templates/site-template.ts` | Reuse existing site template (or create one) — blog does not ship its own |

## Markdown contract

Frontmatter fields (YAML between `---` delimiters):

- `title` — post title (defaults to slug)
- `description` — optional, becomes page meta description
- `slug` — URL segment (defaults to filename without `.md`)

Body is markdown; rendered to HTML at bundle time.

Example:

```md
---
title: Hello World
description: A greeting post
slug: hello
---
Hello **world**.
```

## Wiring example

```ts
// pages/blog.ts
import { join } from "node:path";
import { createPage } from "@stackbox/cms";
import { createBlog } from "@stackbox/cms/plugins/blog";
import { siteTemplate } from "../templates/site-template";

const blog = createBlog({
  contentPath: join(import.meta.dirname, "../content/blog"),
  pathPrefix: "/blog",
  postsPerPage: 10,
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

You may spread extra slot content alongside `listing.content` or `post.content` — blocks or HTML strings (newsletter signup, share buttons, etc.).
