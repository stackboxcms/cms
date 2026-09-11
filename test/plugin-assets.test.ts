import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  getPluginPublicRootDir,
  parsePluginAssetRequest,
  pluginAssetPath,
  servePluginAsset,
} from "../src/link.js";
import { createSite, createSiteConfig } from "../src/site.js";
import { createPage } from "../src/pages.js";
import { createTemplate } from "../src/templates.js";
import { html } from "@hyperspan/html";

describe("pluginAssetPath", () => {
  it("builds paths under /_sb/plugins", () => {
    assert.strictEqual(
      pluginAssetPath("random-quote", "photo.jpg"),
      "/_sb/plugins/random-quote/photo.jpg",
    );
  });

  it("rejects unsafe relative segments", () => {
    assert.throws(() => pluginAssetPath("random-quote", "../secret.txt"));
  });
});

describe("plugin public assets", () => {
  it("copies random-quote quotes.json to dist/public/_sb", () => {
    const file = join(
      getPluginPublicRootDir(),
      "random-quote",
      "quotes.json",
    );
    assert.ok(existsSync(file));
  });

  it("parsePluginAssetRequest rejects traversal", () => {
    assert.strictEqual(
      parsePluginAssetRequest("/_sb/plugins/random-quote/../quotes.json"),
      null,
    );
  });

  it("servePluginAsset returns JSON for bundled quotes", async () => {
    const res = servePluginAsset(
      "/_sb/plugins/random-quote/quotes.json",
      "GET",
    );
    assert.ok(res);
    assert.strictEqual(res!.status, 200);
    assert.match(res!.headers.get("content-type") ?? "", /json/);
    const body = await res!.text();
    assert.match(body, /Rumi/);
  });

  it("site.fetch serves plugin assets before page routes", async () => {
    const siteConfig = createSiteConfig({ name: "Asset Test" });
    const template = createTemplate({
      siteConfig,
      slots: [{ name: "content", options: { required: true, primary: true } }],
      render({ slots }: { slots: { content: { render: () => unknown } } }) {
        return html`<body>${slots.content.render()}</body>`;
      },
    });
    const homePage = createPage(template, {
      path: "/",
      title: "Home",
      slots: { content: ["<p>home</p>"] },
    });
    const site = createSite(siteConfig, { pages: [homePage] });

    const res = await site.fetch(
      new Request("https://example.com/_sb/plugins/random-quote/quotes.json"),
    );
    assert.strictEqual(res.status, 200);
    assert.match(await res.text(), /Rumi/);
  });
});
