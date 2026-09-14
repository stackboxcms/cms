import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { html } from "@hyperspan/html";
import { createBlock, isBlock } from "../src/blocks.js";
import { createPage } from "../src/pages.js";
import { renderPage } from "../src/render-page.js";
import { createSite, createSiteConfig } from "../src/site.js";
import { createTemplate } from "../src/templates.js";

function createFixture() {
  const siteConfig = createSiteConfig({ name: "Hooks Test" });
  const template = createTemplate({
    siteConfig,
    slots: [{ name: "content", options: { required: true, primary: true } }],
    render({ slots }: { slots: { content: { render: () => unknown } } }): ReturnType<typeof html> {
      return html`<body>${slots.content.render()}</body>`;
    },
  });

  let blockRenders = 0;
  const counterBlock = createBlock({
    name: "counter",
    render() {
      blockRenders += 1;
      return html`<span data-count="${blockRenders}">block</span>`;
    },
  })();

  const page = createPage(template, {
    path: "/",
    title: "Home",
    cache: { max: 60_000 },
    slots: { content: [counterBlock, "<p>string</p>"] },
  });

  return { siteConfig, template, page, getBlockRenders: () => blockRenders, counterBlock };
}

describe("site hooks", () => {
  it("behaves like today when hooks are omitted", async () => {
    const { siteConfig, page } = createFixture();
    const site = createSite(siteConfig, { pages: [page] });

    const first = await site.fetch(new Request("https://example.com/"));
    const second = await site.fetch(new Request("https://example.com/"));

    assert.strictEqual(first.status, 200);
    const firstBody = await first.text();
    assert.match(firstBody, /block/);
    assert.doesNotMatch(firstBody, /sb-edit/);
    assert.strictEqual(await second.text(), firstBody);
  });

  it("renderSlotItem wraps block and string slot items", async () => {
    const { siteConfig, page } = createFixture();
    const wrapped: string[] = [];

    const site = createSite(siteConfig, {
      pages: [page],
      hooks: {
        renderSlotItem(html, info) {
          const kind = isBlock(info.item) ? "block" : "html";
          wrapped.push(`${info.slot}:${info.index}:${kind}`);
          return `<wrap data-kind="${kind}">${html}</wrap>`;
        },
      },
    });

    const res = await site.fetch(new Request("https://example.com/"));
    const body = await res.text();

    assert.deepEqual(wrapped.sort(), ["content:0:block", "content:1:html"]);
    assert.match(body, /<wrap data-kind="block">/);
    assert.match(body, /<wrap data-kind="html">/);
  });

  it("afterRender can rewrite page HTML", async () => {
    const { siteConfig, page } = createFixture();

    const site = createSite(siteConfig, {
      pages: [page],
      hooks: {
        afterRender(html) {
          return html.replace("</body>", "<footer>hooked</footer></body>");
        },
      },
    });

    const res = await site.fetch(new Request("https://example.com/"));
    assert.match(await res.text(), /<footer>hooked<\/footer>/);
  });

  it("shouldCache false skips the adapter so each GET re-renders", async () => {
    const { siteConfig, page, getBlockRenders } = createFixture();

    const site = createSite(siteConfig, {
      pages: [page],
      hooks: {
        shouldCache: () => false,
      },
    });

    await site.fetch(new Request("https://example.com/"));
    await site.fetch(new Request("https://example.com/"));

    assert.strictEqual(getBlockRenders(), 2);
  });

  it("shouldCache true still honors page cache TTL", async () => {
    const { siteConfig, page, getBlockRenders } = createFixture();

    const site = createSite(siteConfig, {
      pages: [page],
      hooks: {
        shouldCache: () => true,
      },
    });

    await site.fetch(new Request("https://example.com/"));
    await site.fetch(new Request("https://example.com/"));

    assert.strictEqual(getBlockRenders(), 1);
  });

  it("beforeResponse can add a header", async () => {
    const { siteConfig, page } = createFixture();

    const site = createSite(siteConfig, {
      pages: [page],
      hooks: {
        beforeResponse(response) {
          const headers = new Headers(response.headers);
          headers.set("X-Hook", "1");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        },
      },
    });

    const res = await site.fetch(new Request("https://example.com/"));
    assert.strictEqual(res.headers.get("X-Hook"), "1");
  });

  it("afterRender hook runs through renderPage directly", async () => {
    const { siteConfig, page } = createFixture();
    const htmlOut = await renderPage(page, siteConfig, undefined, {
      afterRender(html) {
        return `${html}<!--after-->`;
      },
    });

    assert.match(htmlOut, /<!--after-->/);
  });
});
