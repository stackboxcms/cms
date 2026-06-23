import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { html } from "@hyperspan/html";
import { createPage } from "../src/pages.js";
import { createSite, createSiteConfig } from "../src/site.js";
import { createTemplate } from "../src/templates.js";

function createFixtureSite() {
  const siteConfig = createSiteConfig({ name: "Routing Test" });

  const template = createTemplate({
    siteConfig,
    slots: [{ name: "content", options: { required: true, primary: true } }],
    render({ slots }: { slots: { content: { render: () => unknown } } }): ReturnType<typeof html> {
      return html`<body>${slots.content.render()}</body>`;
    },
  });

  const homePage = createPage(template, {
    path: "/",
    title: "Home",
    slots: { content: ["<p>home</p>"] },
  });

  const aboutPage = createPage(template, {
    path: "/about",
    title: "About",
    slots: { content: ["<p>about</p>"] },
  });

  return createSite(siteConfig, { pages: [homePage, aboutPage] });
}

describe("site.fetch routing", () => {
  it("routes / and /about to correct pages", async () => {
    const site = createFixtureSite();

    const home = await site.fetch(new Request("https://example.com/"));
    assert.strictEqual(home.status, 200);
    assert.match(await home.text(), /<p>home<\/p>/);

    const about = await site.fetch(new Request("https://example.com/about"));
    assert.strictEqual(about.status, 200);
    assert.match(await about.text(), /<p>about<\/p>/);
  });

  it("normalizes trailing slashes", async () => {
    const site = createFixtureSite();
    const res = await site.fetch(new Request("https://example.com/about/"));
    assert.strictEqual(res.status, 200);
    assert.match(await res.text(), /<p>about<\/p>/);
  });

  it("returns  04 for unknown pages", async () => {
    const site = createFixtureSite();
    const res = await site.fetch(new Request("https://example.com/missing"));
    assert.strictEqual(res.status,  400 + 4);
  });

  it("returns 405 for POST", async () => {
    const site = createFixtureSite();
    const res = await site.fetch(
      new Request("https://example.com/", { method: "POST" }),
    );
    assert.strictEqual(res.status, 405);
  });

  it("returns 200 with empty body for HEAD", async () => {
    const site = createFixtureSite();
    const res = await site.fetch(
      new Request("https://example.com/", { method: "HEAD" }),
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), "");
  });
});
