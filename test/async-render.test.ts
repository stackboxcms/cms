import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { html, renderAsync } from "@hyperspan/html";
import { createModule } from "../src/modules.js";
import { createPage } from "../src/pages.js";
import { renderPage } from "../src/render-page.js";
import { createSiteConfig } from "../src/site.js";
import { renderSlotContent } from "../src/slot-handle.js";
import { createTemplate } from "../src/templates.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("async module rendering", () => {
  it("await async modules in slot content", async () => {
    const siteConfig = createSiteConfig({ name: "Test" });
    const ctx = { siteConfig };

    const slowModule = createModule({
      name: "slow",
      async render() {
        await sleep(25);
        return html`<p>slow module</p>`;
      },
    })();

    const htmlOut = await renderAsync(
      await renderSlotContent("content", [slowModule], ctx, undefined),
    );

    assert.match(htmlOut, /<p>slow module<\/p>/);
    assert.doesNotMatch(htmlOut, /hs:loading/);
  });

  it("resolves multiple async modules concurrently", async () => {
    const siteConfig = createSiteConfig({ name: "Test" });
    const ctx = { siteConfig };
    const order: string[] = [];

    const first = createModule({
      name: "first",
      async render() {
        await sleep(30);
        order.push("first");
        return html`<p>first</p>`;
      },
    })();

    const second = createModule({
      name: "second",
      async render() {
        await sleep(10);
        order.push("second");
        return html`<p>second</p>`;
      },
    })();

    const htmlOut = await renderAsync(
      await renderSlotContent(
        "content",
        ["<p>before</p>", first, second],
        ctx,
        undefined,
      ),
    );

    assert.match(htmlOut, /<p>before<\/p>/);
    assert.match(htmlOut, /<p>first<\/p>/);
    assert.match(htmlOut, /<p>second<\/p>/);
    assert.deepEqual(order, ["second", "first"]);
  });

  it("renders async modules through the full page pipeline", async () => {
    const siteConfig = createSiteConfig({ name: "Test Site" });
    const template = createTemplate({
      siteConfig,
      slots: [{ name: "content", options: { required: true, primary: true } }],
      render({ slots }: { slots: { content: { render: () => unknown } } }): ReturnType<typeof html> {
        return html`<main>${slots.content.render()}</main>`;
      },
    });

    const asyncModule = createModule({
      name: "page-async",
      async render() {
        await sleep(15);
        return html`<p>async page content</p>`;
      },
    })();

    const page = createPage(template, {
      path: "/async-test",
      title: "Async test",
      slots: { content: [asyncModule] },
    });

    const htmlOut = await renderPage(page, siteConfig);

    assert.match(htmlOut, /<main><p>async page content<\/p><\/main>/);
    assert.doesNotMatch(htmlOut, /hs:loading/);
  });
});
