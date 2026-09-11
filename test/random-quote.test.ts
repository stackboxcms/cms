import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderAsync } from "@hyperspan/html";
import { createSiteConfig } from "../src/site.js";
import {
  defaultQuotes,
  pickRandomQuote,
  randomQuoteBlock,
  type Quote,
} from "../src/plugins/random-quote/index.js";

describe("random-quote plugin", () => {
  it("ships bundled default quotes", () => {
    assert.ok(defaultQuotes.length >= 50);
    assert.strictEqual(defaultQuotes[0]!.author, "Rumi");
  });

  it("pickRandomQuote returns a quote from the given list", () => {
    const custom: Quote[] = [
      { text: "Custom quote.", author: "Test Author" },
    ];
    const quote = pickRandomQuote(custom);
    assert.strictEqual(quote.author, "Test Author");
  });

  it("randomQuoteBlock uses bundled quotes by default", async () => {
    const siteConfig = createSiteConfig({ name: "Test" });
    const originalRandom = Math.random;
    Math.random = () => 0;

    try {
      const block = randomQuoteBlock();
      const htmlOut = await renderAsync(block.render({ siteConfig }));

      assert.match(htmlOut, /data-block="random-quote"/);
      assert.match(htmlOut, /<blockquote/);
      assert.match(htmlOut, /beat 40 scholars/);
      assert.match(htmlOut, /— Rumi/);
    } finally {
      Math.random = originalRandom;
    }
  });

  it("randomQuoteBlock accepts custom quotes", async () => {
    const siteConfig = createSiteConfig({ name: "Test" });
    const custom: Quote[] = [
      { text: "Ship your own quotes.", author: "Site Owner" },
    ];
    const block = randomQuoteBlock({ quotes: custom });
    const htmlOut = await renderAsync(block.render({ siteConfig }));

    assert.match(htmlOut, /Ship your own quotes/);
    assert.match(htmlOut, /— Site Owner/);
  });
});
