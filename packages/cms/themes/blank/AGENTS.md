# Stackbox CMS site

You edit a Cloudflare Worker site powered by `@stackbox/cms`.

Before adding features, read `node_modules/@stackbox/cms/dist/AGENTS.md` for the plugin catalog. Do not reimplement bundled plugins.

## Layout

- `src/site.config.ts` — site metadata (`createSiteConfig`)
- `src/server.ts` — registers pages with `createSite` (CMS default entry)
- `src/templates/site-template.ts` — HTML shell (`createTemplate`, `html` from `@stackbox/cms`)
- `src/pages/*.ts` — pages (`createPage` with HTML slot strings)
- `public/` — site static assets; `npm run build` copies registered plugin assets into `public/_sb/plugins/`
- `package.json`, `wrangler.jsonc`, `tsconfig.json` — project config

## Rules

- All file paths are under `/repo/` (absolute paths, e.g. `/repo/src/pages/index.ts`).
- Never write plain English, markdown-only, or HTML-only content into `.ts` files.
- Page files must remain valid TypeScript using `createPage`, `import`, and `export default`.
- To change copy or layout, edit the HTML strings inside `slots.content` arrays.
- A new layout is another `createTemplate` in `src/templates/`. Import `siteConfig` from `src/site.config.ts` and pass that value (`siteConfig,` or `siteConfig: siteConfig`). Never pass an object literal, a spread, or a copied config as `siteConfig`.
- Adding a page: create `src/pages/<name>.ts` and import it in `src/server.ts`.
- Put site-owned static files in `public/` (not under `public/_sb/` — that prefix is reserved for CMS plugins).
- Keep `src/server.ts` as the site entry. Do not rename it.
- Keep `package.json` `"build"` as `stackbox-cms build --publicDir public`.
- Keep `wrangler.jsonc` `main` as `src/server.ts`, `assets.directory` as `./public`, and `nodejs_compat` in `compatibility_flags`. Do not add a wrangler `alias` for `@stackbox/cms` or `@stackbox/edit-mode-plugin`.
- Keep `@stackbox/cms` at `^0.1.3`. Use the latest stable version of `@stackbox/edit-mode-plugin`. You may update those two packages and `nodejs_compat` when upgrading.
- Do not add other npm dependencies unless the user explicitly asks.
- Keep the `@stackbox/edit-mode-plugin` registration in `src/server.ts` as `editPlugin()`. Do not reimplement edit behavior.
- There is no shell. Do not claim to run bash, npm, git, or wrangler.

## Example page file

```ts
import { createPage } from '@stackbox/cms';
import { siteTemplate } from '../templates/site-template';

const homePage = createPage(siteTemplate, {
  path: '/',
  title: 'Home',
  slots: {
    content: ['<h1>Welcome</h1>', '<p>Your site is live.</p>'],
  },
});

export default homePage;
```
