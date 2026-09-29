# Sitemap plugin — agent playbook

## Use when

The user asks for any of:

- sitemap, sitemap.xml, XML sitemap
- SEO crawl list, search engine indexing URLs
- static sitemap file in the public folder

## Do not

- Hand-roll sitemap XML — use `createSitemap()` or the default export
- Put `/sitemap.xml` in `createPage()` — the plugin registers that route
- Forget to register the plugin on `createSite({ plugins })`

## Exports

- **default export** — `createSitemap()` registration; pass to `createSite({ plugins })`
- `createSitemap(options?)` — factory when you need `baseUrl`, `extraUrls`, or `exclude`
- `renderSitemapXml(site, options?)` — shared XML renderer (fetch + build use this)
- `collectSitemapUrls(site, options?)` — absolute `<loc>` URLs
- `SitemapOptions` — type

## API

```ts
import sitemapPlugin, { createSitemap } from "@stackbox/cms/plugins/sitemap";

createSitemap({
  baseUrl?: string,              // defaults to siteConfig.config.url
  extraUrls?: string[],          // site-relative or absolute
  exclude?: string[] | ((path) => boolean),
});
```

**URLs included**

- Every `createPage()` path (origin + path)
- `extraUrls`
- Pages with `meta.robots` containing `noindex` are excluded
- Paths in `exclude` are dropped

**Serving and static file**

- `fetch("/sitemap.xml")` when the plugin is registered
- `stackbox-cms build` writes `{publicDir}/sitemap.xml` via the plugin `build` hook

## Files to create or update

| File | Action |
| --- | --- |
| `server.ts` | Register the default export or `createSitemap(...)` in `createSite({ plugins })` |
| `site.config.ts` | Ensure `url` is set (used as sitemap origin unless `baseUrl` is passed) |
| `package.json` | Add `"build": "stackbox-cms build"` |

## Wiring example

```ts
// server.ts
import sitemapPlugin from "@stackbox/cms/plugins/sitemap";

export default createSite(siteConfig, {
  pages: [homePage, aboutPage],
  plugins: [sitemapPlugin],
});
```

```ts
// With extra URLs and exclusions
import { createSitemap } from "@stackbox/cms/plugins/sitemap";

export default createSite(siteConfig, {
  pages: [homePage, aboutPage],
  plugins: [
    createSitemap({
      extraUrls: ["/llms.txt"],
      exclude: ["/thanks"],
    }),
  ],
});
```
