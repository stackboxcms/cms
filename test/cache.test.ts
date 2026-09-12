import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { html } from "@hyperspan/html";
import { createBlock } from "../src/blocks.js";
import {
  createMemoryCache,
  DEFAULT_CACHE_TTL_MS,
  MAX_CACHE_TTL_MS,
  resolvePageCacheTtlMs,
  type CacheAdapter,
  type CacheEntry,
} from "../src/cache.js";
import { createPage } from "../src/pages.js";
import { createSite, createSiteConfig } from "../src/site.js";
import { createTemplate } from "../src/templates.js";

function createTemplateFixture(
  siteConfig: ReturnType<typeof createSiteConfig>,
) {
  return createTemplate({
    siteConfig,
    slots: [{ name: "content", options: { required: true, primary: true } }],
    render({ slots }: { slots: { content: { render: () => unknown } } }): ReturnType<typeof html> {
      return html`<body>${slots.content.render()}</body>`;
    },
  });
}

function createCounterBlock(name: string) {
  let renders = 0;
  const blockFactory = createBlock({
    name,
    render() {
      renders += 1;
      return html`<span data-render="${renders}">${name}-${renders}</span>`;
    },
  });
  return {
    block: blockFactory(),
    getRenders: () => renders,
  };
}

describe("resolvePageCacheTtlMs", () => {
  it("defaults to one day when no cache config is declared", () => {
    assert.strictEqual(resolvePageCacheTtlMs([]), DEFAULT_CACHE_TTL_MS);
  });

  it("uses the shortest max across page and block configs", () => {
    const ttl = resolvePageCacheTtlMs([
      { max: 5_000 },
      { max: 1_000 },
    ]);
    assert.strictEqual(ttl, 1_000);
  });

  it("floors ttl with the highest min", () => {
    const ttl = resolvePageCacheTtlMs([
      { min: 60_000 },
      { max: 5 * 60_000 },
    ]);
    assert.strictEqual(ttl, 5 * 60_000);
  });

  it("caps ttl at 30 days", () => {
    const ttl = resolvePageCacheTtlMs([{ max: MAX_CACHE_TTL_MS + 1 }]);
    assert.strictEqual(ttl, MAX_CACHE_TTL_MS);
  });

  it("uses effectiveMax when min exceeds max", () => {
    const ttl = resolvePageCacheTtlMs([
      { min: 10_000 },
      { max: 5_000 },
    ]);
    assert.strictEqual(ttl, 5_000);
  });
});

describe("page request cache", () => {
  it("misses on first request and hits on the second for the same path and query", async () => {
    const counter = createCounterBlock("counter");
    const siteConfig = createSiteConfig({ name: "Cache Test" });
    const template = createTemplateFixture(siteConfig);
    const page = createPage(template, {
      path: "/",
      title: "Home",
      cache: { max: 60_000 },
      slots: { content: [counter.block] },
    });
    const site = createSite(siteConfig, { pages: [page] });

    const first = await site.fetch(new Request("https://example.com/"));
    assert.strictEqual(first.status, 200);
    assert.match(await first.text(), /counter-1/);
    assert.strictEqual(counter.getRenders(), 1);
    assert.match(first.headers.get("Cache-Control") ?? "", /max-age=60/);

    const second = await site.fetch(new Request("https://example.com/"));
    assert.strictEqual(second.status, 200);
    assert.match(await second.text(), /counter-1/);
    assert.strictEqual(counter.getRenders(), 1);
  });

  it("treats different query strings as different cache keys", async () => {
    const counter = createCounterBlock("query-counter");
    const siteConfig = createSiteConfig({ name: "Cache Test" });
    const template = createTemplateFixture(siteConfig);
    const page = createPage(template, {
      path: "/",
      title: "Home",
      cache: { max: 60_000 },
      slots: { content: [counter.block] },
    });
    const site = createSite(siteConfig, { pages: [page] });

    await site.fetch(new Request("https://example.com/?preview=1"));
    await site.fetch(new Request("https://example.com/?preview=2"));

    assert.strictEqual(counter.getRenders(), 2);
  });

  it("does not cache when site config sets cache: false", async () => {
    const counter = createCounterBlock("site-dynamic");
    const siteConfig = createSiteConfig({ name: "Cache Test", cache: false });
    const template = createTemplateFixture(siteConfig);
    const page = createPage(template, {
      path: "/",
      title: "Home",
      slots: { content: [counter.block] },
    });
    const site = createSite(siteConfig, { pages: [page] });

    const first = await site.fetch(new Request("https://example.com/"));
    const second = await site.fetch(new Request("https://example.com/"));

    assert.strictEqual(first.status, 200);
    assert.strictEqual(second.status, 200);
    assert.strictEqual(counter.getRenders(), 2);
    assert.strictEqual(first.headers.get("Cache-Control"), "no-store");
  });

  it("does not cache when the page sets cache: false", async () => {
    const counter = createCounterBlock("page-dynamic");
    const siteConfig = createSiteConfig({ name: "Cache Test" });
    const template = createTemplateFixture(siteConfig);
    const page = createPage(template, {
      path: "/",
      title: "Home",
      cache: false,
      slots: { content: [counter.block] },
    });
    const site = createSite(siteConfig, { pages: [page] });

    await site.fetch(new Request("https://example.com/"));
    await site.fetch(new Request("https://example.com/"));

    assert.strictEqual(counter.getRenders(), 2);
  });

  it("does not cache when any on-page block sets cache: false", async () => {
    const dynamicBlock = createBlock({
      name: "dynamic-block",
      cache: false,
      render() {
        return html`<span>dynamic</span>`;
      },
    })();
    const counter = createCounterBlock("block-dynamic-page");
    const siteConfig = createSiteConfig({ name: "Cache Test" });
    const template = createTemplateFixture(siteConfig);
    const page = createPage(template, {
      path: "/",
      title: "Home",
      cache: { max: 60_000 },
      slots: { content: [dynamicBlock, counter.block] },
    });
    const site = createSite(siteConfig, { pages: [page] });

    await site.fetch(new Request("https://example.com/"));
    await site.fetch(new Request("https://example.com/"));

    assert.strictEqual(counter.getRenders(), 2);
  });

  it("serves stale HTML immediately and revalidates once in the background", async () => {
    const counter = createCounterBlock("stale");
    const adapter = createMemoryCache();
    const siteConfig = createSiteConfig({ name: "Cache Test" });
    const template = createTemplateFixture(siteConfig);
    const page = createPage(template, {
      path: "/",
      title: "Home",
      cache: { max: 1_000 },
      slots: { content: [counter.block] },
    });
    const site = createSite(siteConfig, { pages: [page], cacheAdapter: adapter });

    await site.fetch(new Request("https://example.com/"));
    assert.strictEqual(counter.getRenders(), 1);

    const staleEntry: CacheEntry = {
      html: "<body><span data-render=\"1\">stale-1</span></body>",
      expiresAt: Date.now() - 1,
    };
    await adapter.set("/", staleEntry);

    const staleResponse = await site.fetch(new Request("https://example.com/"));
    assert.strictEqual(staleResponse.status, 200);
    assert.match(await staleResponse.text(), /stale-1/);
    assert.match(
      staleResponse.headers.get("Cache-Control") ?? "",
      /stale-while-revalidate=1/,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.strictEqual(counter.getRenders(), 2);

    const freshResponse = await site.fetch(new Request("https://example.com/"));
    assert.match(await freshResponse.text(), /stale-2/);
    assert.strictEqual(counter.getRenders(), 2);
  });

  it("shares one render across concurrent cache misses", async () => {
    let activeRenders = 0;
    let peakActiveRenders = 0;
    const slowBlock = createBlock({
      name: "slow",
      render() {
        activeRenders += 1;
        peakActiveRenders = Math.max(peakActiveRenders, activeRenders);
        return new Promise<ReturnType<typeof html>>((resolve) => {
          setTimeout(() => {
            activeRenders -= 1;
            resolve(html`<span>slow</span>`);
          }, 25);
        });
      },
    })();

    const siteConfig = createSiteConfig({ name: "Cache Test" });
    const template = createTemplateFixture(siteConfig);
    const page = createPage(template, {
      path: "/",
      title: "Home",
      cache: { max: 60_000 },
      slots: { content: [slowBlock] },
    });
    const site = createSite(siteConfig, { pages: [page] });

    const [first, second] = await Promise.all([
      site.fetch(new Request("https://example.com/")),
      site.fetch(new Request("https://example.com/")),
    ]);

    assert.strictEqual(first.status, 200);
    assert.strictEqual(second.status, 200);
    assert.strictEqual(peakActiveRenders, 1);
  });

  it("keeps the previous HTML when a stale refresh fails", async () => {
    let shouldFail = false;
    const flakyBlock = createBlock({
      name: "flaky",
      render() {
        if (shouldFail) {
          throw new Error("refresh failed");
        }
        return html`<span>good</span>`;
      },
    })();

    class TrackingCache implements CacheAdapter {
      entry: CacheEntry | undefined;

      get() {
        return this.entry;
      }

      set(_key: string, entry: CacheEntry) {
        this.entry = entry;
      }
    }

    const adapter = new TrackingCache();
    const siteConfig = createSiteConfig({ name: "Cache Test" });
    const template = createTemplateFixture(siteConfig);
    const page = createPage(template, {
      path: "/",
      title: "Home",
      cache: { max: 1_000 },
      slots: { content: [flakyBlock] },
    });
    const site = createSite(siteConfig, { pages: [page], cacheAdapter: adapter });

    await site.fetch(new Request("https://example.com/"));
    assert.match(adapter.entry?.html ?? "", /good/);

    adapter.entry = {
      html: adapter.entry!.html,
      expiresAt: Date.now() - 1,
    };
    shouldFail = true;

    const staleResponse = await site.fetch(new Request("https://example.com/"));
    assert.match(await staleResponse.text(), /good/);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.match(adapter.entry?.html ?? "", /good/);
  });

  it("uses default one-day ttl when no cache config is declared", async () => {
    const siteConfig = createSiteConfig({ name: "Cache Test" });
    const template = createTemplateFixture(siteConfig);
    const page = createPage(template, {
      path: "/",
      title: "Home",
      slots: { content: ["<p>cached</p>"] },
    });
    const site = createSite(siteConfig, { pages: [page] });

    const response = await site.fetch(new Request("https://example.com/"));
    const maxAge = Number(
      (response.headers.get("Cache-Control") ?? "").match(/max-age=(\d+)/)?.[1],
    );
    assert.strictEqual(maxAge, DEFAULT_CACHE_TTL_MS / 1000);
  });
});
