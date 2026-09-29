# Random quote plugin — agent playbook

## Use when

The user asks for any of:

- random quote, quote of the day, inspirational quote
- sidebar quote, footer quote, block that shows a quote
- embed a rotating or random quotation on a page

This plugin is a **block-only** example — it exports no page factory or content objects. Drop the block into any slot.

## Do not

- Hand-roll quote rotation logic — use `randomQuoteBlock()` from this plugin
- Build a full quote page unless the user explicitly asks — this plugin ships a **block**, not routes

## Exports

- **default export** — `createPlugin()` registration; pass to `createSite({ plugins })` to serve `public_assets/`
- `randomQuoteBlock(options?)` — block factory; `{ quotes }` overrides bundled defaults
- `defaultQuotes` — bundled quote array (imported from `assets/quotes.json`)
- `pickRandomQuote(quotes)` — picks one quote at random
- `Quote` — type `{ text, author }`
- `RandomQuoteBlockOptions` — type `{ quotes?: readonly Quote[] }`

## API

```ts
import { randomQuoteBlock } from "@stackbox/cms/plugins/random-quote";

// Bundled quotes (default):
slots: { sidebar: [randomQuoteBlock()] }

// Custom quotes from the user's site:
import myQuotes from "../content/quotes.json" with { type: "json" };

slots: { sidebar: [randomQuoteBlock({ quotes: myQuotes })] }
```

Custom JSON must be an array of `{ text, author }` objects — same shape as bundled `assets/quotes.json`.

Each request renders a randomly selected quote from the configured list.

## Assets

- `assets/quotes.json` — private; imported into JS as `defaultQuotes`
- `public_assets/widget.css` — public; served at `/_sb/plugins/sb-random-quote/widget.css` **only after** this plugin is registered

```ts
import randomQuotePlugin from "@stackbox/cms/plugins/random-quote";

export default createSite(siteConfig, {
  pages: [homePage],
  plugins: [randomQuotePlugin],
});
```

Use `pluginAssetPath("sb-random-quote", "widget.css")` from `@stackbox/cms/link` for the stylesheet href. Do not copy plugin assets by scanning a `plugins/` folder — run `npx stackbox-cms build` so the package build script copies only registered plugins.

## Files to create or update

| File | Action |
| --- | --- |
| `server.ts` | Register the default export in `createSite({ plugins })` so public assets are served |
| `package.json` | Add `"build": "stackbox-cms build"` so registered plugin assets are copied |
| Any page using the block | Import `randomQuoteBlock` and add to a slot array |
| `content/quotes.json` | Optional — user's own quotes when not using bundled defaults |
| `templates/site-template.ts` | Ensure the target slot exists (e.g. `sidebar`, `content`) |

Register the plugin in `server.ts` whenever the block is used so `public_assets/` are served. No `pages/*.ts` changes unless adding the block to a new page.

## Wiring example

```ts
// pages/home.ts
import { createPage } from "@stackbox/cms";
import { randomQuoteBlock } from "@stackbox/cms/plugins/random-quote";
import myQuotes from "../content/quotes.json" with { type: "json" };
import { siteTemplate } from "../templates/site-template";

export const homePage = createPage(siteTemplate, {
  path: "/",
  title: "Home",
  slots: {
    content: ["<p>Welcome.</p>"],
    sidebar: [randomQuoteBlock({ quotes: myQuotes })],
  },
});
```

```ts
// server.ts
import randomQuotePlugin from "@stackbox/cms/plugins/random-quote";

export default createSite(siteConfig, {
  pages: [homePage],
  plugins: [randomQuotePlugin],
});
```

Use `randomQuoteBlock()` without options to keep bundled defaults. Combine with other blocks or HTML strings in the same slot.
