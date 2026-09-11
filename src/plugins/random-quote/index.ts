import { html } from "@hyperspan/html";
import { createBlock } from "../../blocks.js";
import bundledQuotes from "./public_assets/quotes.json" with { type: "json" };

export type Quote = {
  text: string;
  author: string;
};

export type RandomQuoteBlockOptions = {
  /** Custom quotes. Omit to use bundled defaults. */
  quotes?: readonly Quote[];
};

export const defaultQuotes: readonly Quote[] = bundledQuotes;

export function pickRandomQuote(quotes: readonly Quote[]): Quote {
  if (quotes.length === 0) {
    throw new Error("random-quote: quotes must contain at least one quote");
  }
  return quotes[Math.floor(Math.random() * quotes.length)]!;
}

export const randomQuoteBlock = createBlock({
  name: "random-quote",
  render(options?: RandomQuoteBlockOptions) {
    const quote = pickRandomQuote(options?.quotes ?? defaultQuotes);
    return html`<blockquote data-block="random-quote" cite="${quote.author}">
  <p>${quote.text}</p>
  <footer>— ${quote.author}</footer>
</blockquote>`;
  },
});
