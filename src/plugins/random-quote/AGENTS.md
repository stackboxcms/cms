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

- `randomQuoteBlock(options?)` — block factory; `{ quotes }` overrides bundled defaults
- `defaultQuotes` — bundled quote array (imported from `public_assets/quotes.json`)
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

Custom JSON must be an array of `{ text, author }` objects — same shape as bundled `public_assets/quotes.json`.

Bundled quotes are also served as a public asset at `/_sb/plugins/random-quote/quotes.json` (via `pluginAssetPath("random-quote", "quotes.json")` from `@stackbox/cms/link`).

Each request renders a randomly selected quote from the configured list.

## Public assets

Bundled quotes live in `public_assets/quotes.json`. The build copies this folder to `dist/public/_sb/plugins/random-quote/` automatically — do not edit the copy script.

## Files to create or update

| File | Action |
| --- | --- |
| Any page using the block | Import `randomQuoteBlock` and add to a slot array |
| `content/quotes.json` | Optional — user's own quotes when not using bundled defaults |
| `templates/site-template.ts` | Ensure the target slot exists (e.g. `sidebar`, `content`) |

No `pages/*.ts` or `server.ts` changes required unless adding the block to a new page.

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

Use `randomQuoteBlock()` without options to keep bundled defaults. Combine with other blocks or HTML strings in the same slot.
