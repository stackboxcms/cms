import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { html } from "@hyperspan/html";
import { createBlock, createPage, createSite, createSiteConfig, createTemplate } from "@stackbox/cms";
import { normalizeSource } from "../src/hooks.js";
import { editPlugin } from "../src/plugin.js";

function createEditFixture() {
  const siteConfig = createSiteConfig({ name: "Edit Test" });
  const template = createTemplate({
    render({ slots }: { slots: { content: { render: () => unknown } } }): ReturnType<typeof html> {
      return html`<html><head></head><body>${slots.content.render()}</body></html>`;
    },
    siteConfig,
    slots: [{ name: "content", options: { primary: true, required: true } }],
  });

  let blockRenders = 0;
  const blockFactory = createBlock({
    name: "sample-block",
    render() {
      blockRenders += 1;
      return html`<p>block-${blockRenders}</p>`;
    },
    source: "file:///pages/blocks/sample.ts",
  });

  const page = createPage(template, {
    cache: { max: 60_000 },
    path: "/",
    slots: {
      content: [blockFactory(), "<p>welcome</p>"],
    },
    source: "file:///pages/home.ts",
    title: "Home",
  });

  const site = createSite(siteConfig, {
    pages: [page],
    plugins: [editPlugin()],
  });

  return { getBlockRenders: () => blockRenders, site };
}

describe("edit hooks", () => {
  it("leaves normal requests unmarked and cacheable", async () => {
    const { getBlockRenders, site } = createEditFixture();

    await site.fetch(new Request("https://example.com/"));
    await site.fetch(new Request("https://example.com/"));

    const body = await (await site.fetch(new Request("https://example.com/"))).text();

    assert.doesNotMatch(body, /<sb-edit/);
    assert.doesNotMatch(body, /sb-edit-page/);
    assert.strictEqual(getBlockRenders(), 1);
  });

  it("wraps content and injects the behavior script when ?sbedit=1", async () => {
    const { site } = createEditFixture();
    const body = await (await site.fetch(new Request("https://example.com/?sbedit=1"))).text();

    assert.match(body, /<sb-edit slot="content" index="0" kind="block" name="sample-block"/);
    assert.match(body, /<sb-edit slot="content" index="1" kind="html"/);
    assert.match(body, /id="sb-edit-page"/);
    assert.match(body, /"path":"\/"/);
    assert.match(body, /"title":"Home"/);
    assert.match(body, /sb-edit\{display:contents\}/);
    assert.match(body, /src="\/_sb\/plugins\/sb-edit\/edit\.js"/);
  });

  it("does not mark when ?sbedit=0", async () => {
    const { site } = createEditFixture();
    const body = await (await site.fetch(new Request("https://example.com/?sbedit=0"))).text();
    assert.doesNotMatch(body, /<sb-edit/);
  });

  it("includes normalized source attributes when provided", async () => {
    const { site } = createEditFixture();
    const body = await (await site.fetch(new Request("https://example.com/?sbedit=1"))).text();

    assert.match(body, new RegExp(`source="${normalizeSource("file:///pages/blocks/sample.ts")}"`));
    assert.match(body, new RegExp(`page-source="${normalizeSource("file:///pages/home.ts")}"`));
  });

  it("sets Cache-Control no-store and re-renders on each edit request", async () => {
    const { getBlockRenders, site } = createEditFixture();

    const first = await site.fetch(new Request("https://example.com/?sbedit=1"));
    assert.strictEqual(first.headers.get("Cache-Control"), "no-store");

    await site.fetch(new Request("https://example.com/?sbedit=1"));
    assert.strictEqual(getBlockRenders(), 2);
  });

  it("accepts option overrides", () => {
    const plugin = editPlugin({ name: "sb-edit-custom", root: "." });
    assert.strictEqual(plugin.name, "sb-edit-custom");
    assert.strictEqual(plugin.root, resolve("."));
  });

  it("defaults to a non-empty root", () => {
    const plugin = editPlugin();
    assert.ok(plugin.root.length > 0);
  });
});
