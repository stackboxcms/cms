import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { html } from "@hyperspan/html";
import { copyRegisteredPluginAssets } from "../src/plugin.js";
import {
  parsePluginAssetRequest,
  pluginAssetPath,
  servePluginAsset,
} from "../src/link.js";
import { createPage } from "../src/pages.js";
import randomQuotePlugin from "../src/plugins/random-quote/index.js";
import { createSite, createSiteConfig } from "../src/site.js";
import { createTemplate } from "../src/templates.js";

function createHomeSite(plugins: readonly typeof randomQuotePlugin[] = []) {
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
  return createSite(siteConfig, { pages: [homePage], plugins });
}

describe("pluginAssetPath", () => {
  it("builds paths under /_sb/plugins", () => {
    assert.strictEqual(
      pluginAssetPath("sb-random-quote", "widget.css"),
      "/_sb/plugins/sb-random-quote/widget.css",
    );
  });

  it("rejects unsafe relative segments", () => {
    assert.throws(() => pluginAssetPath("sb-random-quote", "../secret.txt"));
  });
});

describe("plugin public assets", () => {
  it("does not copy public_assets next to compiled plugin JS", () => {
    const compiledPublic = join(
      import.meta.dirname,
      "../dist/plugins/random-quote/public_assets/widget.css",
    );
    assert.ok(!existsSync(compiledPublic));
  });

  it("copies private assets next to compiled plugin JS", () => {
    const compiledQuotes = join(
      import.meta.dirname,
      "../dist/plugins/random-quote/assets/quotes.json",
    );
    assert.ok(existsSync(compiledQuotes));
  });

  it("parsePluginAssetRequest rejects traversal", () => {
    assert.strictEqual(
      parsePluginAssetRequest("/_sb/plugins/sb-random-quote/../widget.css"),
      null,
    );
  });

  it("servePluginAsset 404s when the plugin is not registered", async () => {
    const res = servePluginAsset(
      "/_sb/plugins/sb-random-quote/widget.css",
      "GET",
    );
    assert.ok(res);
    assert.strictEqual(res!.status, 404);
  });

  it("servePluginAsset returns CSS for a registered plugin", async () => {
    const res = servePluginAsset(
      "/_sb/plugins/sb-random-quote/widget.css",
      "GET",
      [randomQuotePlugin],
    );
    assert.ok(res);
    assert.strictEqual(res!.status, 200);
    assert.match(res!.headers.get("content-type") ?? "", /css/);
    const body = await res!.text();
    assert.match(body, /data-block="random-quote"/);
  });

  it("site.fetch serves registered plugin assets and not unregistered ones", async () => {
    const withoutPlugin = createHomeSite();
    const missing = await withoutPlugin.fetch(
      new Request("https://example.com/_sb/plugins/sb-random-quote/widget.css"),
    );
    assert.strictEqual(missing.status, 404);

    const withPlugin = createHomeSite([randomQuotePlugin]);
    const res = await withPlugin.fetch(
      new Request("https://example.com/_sb/plugins/sb-random-quote/widget.css"),
    );
    assert.strictEqual(res.status, 200);
    assert.match(await res.text(), /data-block="random-quote"/);
  });

  it("createSite rejects duplicate plugin names", () => {
    assert.throws(
      () => createHomeSite([randomQuotePlugin, randomQuotePlugin]),
      /duplicate plugin name/,
    );
  });

  it("createSite rejects plugins that are missing required metadata", () => {
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

    assert.throws(
      () =>
        createSite(siteConfig, {
          pages: [homePage],
          plugins: [{ name: "almost" } as never],
        }),
      /createPlugin/,
    );
  });

  it("copyRegisteredPluginAssets writes only registered public files", () => {
    const dest = mkdtempSync(join(tmpdir(), "stackbox-public-"));
    try {
      copyRegisteredPluginAssets([randomQuotePlugin], dest);
      const css = join(dest, "_sb", "plugins", "sb-random-quote", "widget.css");
      assert.match(readFileSync(css, "utf8"), /data-block="random-quote"/);
      assert.ok(
        !existsSync(join(dest, "_sb", "plugins", "sb-blog")),
        "blog was not registered",
      );
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});
