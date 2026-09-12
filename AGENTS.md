# @stackbox/cms — agent instructions

Stackbox is a code-first CMS that assembles TypeScript into a **fetch-handler-compatible server**. Use these conventions when building or extending a site.

## Site conventions

| Primitive | Factory | Purpose |
| --- | --- | --- |
| Site config | `createSiteConfig(config)` | Definition-time settings shared by templates and pages |
| Site | `createSite(siteConfig, { pages, plugins? })` | Runtime router with `fetch(request, env)` |
| Template | `createTemplate({ siteConfig, slots, render })` | Reusable layout with named slots |
| Page | `createPage(template, { path, title, slots })` | A single URL built from a template + slot content |
| Block | `createBlock({ name, render })` | A content block placed into a slot at request time |
| Plugin | `createPlugin({ name, description, version, keywords, root })` | Packaged feature; register on the site when used |

**Project layout:**

```
site.config.ts       # createSiteConfig
server.ts            # createSite(...) — default export is the fetch handler
templates/           # shared createTemplate() layouts
pages/               # createPage() per route or feature
content/             # markdown or other bundle-time content (per feature)
package.json         # "build": "stackbox-cms build"
```

The default export from `server.ts` implements `fetch(request, env)` and returns a `Response`. It works on Cloudflare Workers, Bun, Deno, and any runtime that speaks the fetch-handler pattern.

## Plugins vs blocks

- **Plugin** — a packaged use-case (bundled under `@stackbox/cms/plugins/<name>`, or a third-party package with the same shape). **Default-exports** a `createPlugin()` registration object, plus named factories, content objects, blocks, types, and helpers.
- **Block** — a core primitive via `createBlock()`. Renders HTML into a template slot. Usable inside or outside plugins.

Slot content is `Block | string`. Plugin content arrays can interleave blocks and HTML strings.

**Register plugins when you use them.** Importing a plugin module is not enough — pass its default export to `createSite({ plugins })`. Only registered plugins have their `public_assets/` copied or served. Third-party packages are registered the same way; they are not discovered from a `plugins/` folder.

```ts
import blogPlugin from "@stackbox/cms/plugins/blog";
import randomQuotePlugin from "@stackbox/cms/plugins/random-quote";

export default createSite(siteConfig, {
  pages: [homePage, ...blogListingPages, ...blogPostPages],
  plugins: [blogPlugin, randomQuotePlugin],
});
```

`createPlugin({ name, description, version, keywords, root })` is **required**. `createSite` throws if a registered value is missing that metadata. `keywords` tell agents when to reach for the plugin.

Optional hooks on `createPlugin()`:

- **`routes({ site })`** — site-level paths served by `fetch()` before the GET/HEAD gate, plugin assets, and pages (e.g. `/sitemap.xml`). The route handler decides which HTTP methods are allowed. Must return synchronously. Paths must not collide with pages or other plugin routes.
- **`build({ site, outDir, publicDir })`** — called by `stackbox-cms build` after copying registered `public_assets/`. Write generated files into `publicDir` (or elsewhere under `outDir`).

## Plugin catalog

Before implementing a use-case (blog, newsletter, docs, …), check this table. If the user's request matches a row, **read only that plugin's AGENTS.md** and follow it. Do not invent a parallel implementation.

<!-- plugin-catalog:start -->
<!-- plugin-catalog:end -->

When adding a new plugin to this package, add a folder under `src/plugins/<name>/`, **default-export** the `createPlugin()` registration from `index.ts`, and create `src/plugins/<name>/AGENTS.md` using the same heading structure as the blog plugin. Run `npm run build` — the package scans `dist/plugins/` and writes the keyword catalog to `dist/AGENTS.md` from each plugin's `keywords`. Document all export kinds (factory, types, blocks, helpers).

## Plugin layout and assets

Every plugin — bundled or third-party — has the same shape:

```
index.ts            # default export: createPlugin({ ... }); named exports: factories, types, blocks
AGENTS.md           # agent playbook
assets/             # private files imported by JS (JSON, templates, …)
public_assets/      # files served over HTTP (images, CSS, fonts, …)
```

`root` is the directory that contains `assets/` and `public_assets/`. Pass `import.meta.dirname` when those folders sit next to the plugin entry. A third-party package may pass its package root instead.

| Folder | Copied to | When |
| --- | --- | --- |
| `assets/` | `{plugin.root}/assets` (next to compiled JS) | Package build of that plugin (`copyPluginPrivateAssets`) |
| `public_assets/` | `{publicDir}/_sb/plugins/{name}/` | Site build, **only for plugins registered on the site** (`copyRegisteredPluginAssets`) |

`public_assets/` is no longer mirrored into the plugin's compiled folder. Import private data from `./assets/...`, not from `public_assets/`.

At request time, `createSite.fetch` order is: **plugin routes** → **plugin public assets** (`/_sb/plugins/...`) → **pages**.

For a static `public/` directory, run the package build script — it loads the site, reads `site.plugins`, copies registered `public_assets/`, then runs each plugin's `build` hook:

```bash
npx stackbox-cms build
```

```json
"scripts": {
  "build": "stackbox-cms build"
}
```

```ts
import { build } from "@stackbox/cms/build";
import site from "./server.ts";

await build({
  site,
  outDir: "dist",
  publicDir: "dist/public",
});
```

Defaults: `--site` looks for `server.ts` (then `server.js`, `src/server.ts`, `src/server.js`); `outDir` is `dist`; `publicDir` is `{outDir}/public`. Flags: `--site`, `--outDir`, `--publicDir`.

Use `pluginAssetPath()` from `@stackbox/cms/link` for `<img src>`, `<link href>`, etc. Do not put site files under `/_sb/` — that prefix is reserved for Stackbox plugin assets.

```ts
import { pluginAssetPath } from "@stackbox/cms/link";

pluginAssetPath("sb-random-quote", "widget.css");
// → "/_sb/plugins/sb-random-quote/widget.css"
```

## For site agents

If you are working in a **consumer site repo** (not this package), read the generated agent instructions from the installed package:

```
node_modules/@stackbox/cms/dist/AGENTS.md
```

Recommended snippet for the site's own `AGENTS.md`:

```md
This site uses @stackbox/cms. Before adding features, read
`node_modules/@stackbox/cms/dist/AGENTS.md` and follow its plugin catalog.
Do not reimplement bundled plugins.
```

When a request matches a catalog row, open **only** that plugin's instructions file (e.g. `node_modules/@stackbox/cms/src/plugins/blog/AGENTS.md`).
