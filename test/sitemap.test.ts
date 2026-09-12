import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { html } from "@hyperspan/html";
import { build } from "../src/build.js";
import { createPage } from "../src/pages.js";
import sitemapPlugin, {
  collectSitemapUrls,
  createSitemap,
  renderSitemapXml,
} from "../src/plugins/sitemap/index.js";
import { createSite, createSiteConfig } from "../src/site.js";
import { createTemplate } from "../src/templates.js";

function createFixtureSite(
  plugins: readonly typeof sitemapPlugin[] = [],
  pages?: ReturnType<typeof createHomePage>[],
) {
  const siteConfig = createSiteConfig({
    name: "Sitemap Test",
    url: "https://example.com",
  });
  const home = createHomePage(siteConfig);
  const about = createPage(createTemplate({
    siteConfig,
    slots: [{ name: "content", options: { required: true, primary: true } }],
    render({ slots }: { slots: { content: { render: () => unknown } } }) {
      return html`<body>${slots.content.render()}</body>`;
    },
  }), {
    path: "/about",
    title: "About",
    slots: { content: ["<p>about</p>"] },
  });
  return createSite(siteConfig, {
    pages: pages ?? [home, about],
    plugins,
  });
}

function createHomePage(siteConfig: ReturnType<typeof createSiteConfig>) {
  const template = createTemplate({
    siteConfig,
    slots: [{ name: "content", options: { required: true, primary: true } }],
    render({ slots }: { slots: { content: { render: () => unknown } } }) {
      return html`<body>${slots.content.render()}</body>`;
    },
  });
  return createPage(template, {
    path: "/",
    title: "Home",
    slots: { content: ["<p>home</p>"] },
  });
}

describe("renderSitemapXml", () => {
  it("includes all page URLs with the site origin", () => {
    const site = createFixtureSite();
    const xml = renderSitemapXml(site);
    assert.match(xml, /<loc>https:\/\/example\.com\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/example\.com\/about<\/loc>/);
  });

  it("supports extraUrls and exclude", () => {
    const site = createFixtureSite();
    const xml = renderSitemapXml(site, {
      extraUrls: ["/llms.txt", "https://example.com/external"],
      exclude: ["/about"],
    });
    assert.match(xml, /<loc>https:\/\/example\.com\/<\/loc>/);
    assert.doesNotMatch(xml, /\/about/);
    assert.match(xml, /<loc>https:\/\/example\.com\/llms\.txt<\/loc>/);
    assert.match(xml, /<loc>https:\/\/example\.com\/external<\/loc>/);
  });

  it("excludes pages with noindex robots meta", () => {
    const siteConfig = createSiteConfig({
      name: "Sitemap Test",
      url: "https://example.com",
    });
    const home = createHomePage(siteConfig);
    const secret = createPage(createTemplate({
      siteConfig,
      slots: [{ name: "content", options: { required: true, primary: true } }],
      render({ slots }: { slots: { content: { render: () => unknown } } }) {
        return html`<body>${slots.content.render()}</body>`;
      },
    }), {
      path: "/secret",
      title: "Secret",
      meta: { robots: "noindex" },
      slots: { content: ["<p>secret</p>"] },
    });
    const site = createSite(siteConfig, { pages: [home, secret] });
    const urls = collectSitemapUrls(site);
    assert.deepEqual(urls, ["https://example.com/"]);
  });

  it("throws when base URL is missing", () => {
    const siteConfig = createSiteConfig({ name: "No URL" });
    const site = createSite(siteConfig, {
      pages: [createHomePage(siteConfig)],
    });
    assert.throws(() => renderSitemapXml(site), /baseUrl or siteConfig\.url/);
  });
});

describe("sitemap plugin fetch", () => {
  it("returns 404 for /sitemap.xml when the plugin is not registered", async () => {
    const site = createFixtureSite();
    const res = await site.fetch(
      new Request("https://example.com/sitemap.xml"),
    );
    assert.strictEqual(res.status, 404);
  });

  it("serves sitemap.xml when the plugin is registered", async () => {
    const site = createFixtureSite([sitemapPlugin]);
    const res = await site.fetch(
      new Request("https://example.com/sitemap.xml"),
    );
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /xml/);
    const body = await res.text();
    assert.match(body, /<urlset/);
    assert.match(body, /<loc>https:\/\/example\.com\/about<\/loc>/);
  });

  it("returns empty body for HEAD", async () => {
    const site = createFixtureSite([sitemapPlugin]);
    const res = await site.fetch(
      new Request("https://example.com/sitemap.xml", { method: "HEAD" }),
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), "");
    assert.ok(Number(res.headers.get("content-length")) > 0);
  });

  it("allows plugin routes to handle methods other than GET and HEAD", async () => {
    const siteConfig = createSiteConfig({
      name: "Sitemap Test",
      url: "https://example.com",
    });
    const home = createHomePage(siteConfig);
    const postPlugin = createSitemap();
    postPlugin.routes = () => [
      {
        path: "/api/ping",
        fetch(_request, ctx) {
          return ctx.res.text("pong", { status: 200 });
        },
      },
    ];
    const site = createSite(siteConfig, {
      pages: [home],
      plugins: [postPlugin],
    });
    const res = await site.fetch(
      new Request("https://example.com/api/ping", { method: "POST" }),
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), "pong");
  });

  it("throws when a plugin route conflicts with a page path", () => {
    const siteConfig = createSiteConfig({
      name: "Sitemap Test",
      url: "https://example.com",
    });
    const conflictingPlugin = createSitemap();
    conflictingPlugin.routes = () => [
      {
        path: "/about",
        fetch() {
          return new Response("conflict");
        },
      },
    ];
    assert.throws(
      () => createFixtureSite([conflictingPlugin]),
      /conflicts with a page path/,
    );
  });
});

describe("sitemap plugin build", () => {
  it("writes sitemap.xml into publicDir", async () => {
    const dest = mkdtempSync(join(tmpdir(), "stackbox-sitemap-"));
    try {
      const site = createFixtureSite([sitemapPlugin]);
      await build({
        site,
        outDir: join(dest, "dist"),
        publicDir: join(dest, "public"),
      });
      const file = join(dest, "public", "sitemap.xml");
      assert.ok(existsSync(file));
      const xml = readFileSync(file, "utf8");
      assert.match(xml, /<loc>https:\/\/example\.com\/about<\/loc>/);

      const res = await site.fetch(
        new Request("https://example.com/sitemap.xml"),
      );
      assert.strictEqual(await res.text(), xml);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it("createSitemap accepts custom options", async () => {
    const site = createFixtureSite([createSitemap({ exclude: ["/about"] })]);
    const res = await site.fetch(
      new Request("https://example.com/sitemap.xml"),
    );
    const body = await res.text();
    assert.match(body, /<loc>https:\/\/example\.com\/<\/loc>/);
    assert.doesNotMatch(body, /\/about/);
  });
});
