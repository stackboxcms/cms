import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { html } from "@hyperspan/html";
import { createBlock } from "../src/blocks.js";
import { createPage } from "../src/pages.js";
import { createSite, createSiteConfig } from "../src/site.js";
import { createTemplate } from "../src/templates.js";
import { createEditHooks, normalizeSource } from "./edit-hooks.js";

function createEditFixture() {
  const siteConfig = createSiteConfig({ name: "Edit Test" });
  const template = createTemplate({
    siteConfig,
    slots: [{ name: "content", options: { required: true, primary: true } }],
    render({ slots }: { slots: { content: { render: () => unknown } } }): ReturnType<typeof html> {
      return html`<html><head></head><body>${slots.content.render()}</body></html>`;
    },
  });

  let blockRenders = 0;
  const blockFactory = createBlock({
    name: "sample-block",
    source: "file:///pages/blocks/sample.ts",
    render() {
      blockRenders += 1;
      return html`<p>block-${blockRenders}</p>`;
    },
  });

  const page = createPage(template, {
    path: "/",
    title: "Home",
    source: "file:///pages/home.ts",
    cache: { max: 60_000 },
    slots: {
      content: [blockFactory(), "<p>welcome</p>"],
    },
  });

  const site = createSite(siteConfig, {
    pages: [page],
    hooks: createEditHooks(),
  });

  return { site, getBlockRenders: () => blockRenders };
}

describe("edit overlay hooks consumer", () => {
  it("leaves normal requests unmarked and cacheable", async () => {
    const { site, getBlockRenders } = createEditFixture();

    await site.fetch(new Request("https://example.com/"));
    await site.fetch(new Request("https://example.com/"));

    const res = await site.fetch(new Request("https://example.com/"));
    const body = await res.text();

    assert.doesNotMatch(body, /<sb-edit/);
    assert.doesNotMatch(body, /sb-edit-page/);
    assert.strictEqual(getBlockRenders(), 1);
  });

  it("wraps content and injects page metadata when ?edit=1", async () => {
    const { site } = createEditFixture();

    const res = await site.fetch(new Request("https://example.com/?edit=1"));
    const body = await res.text();

    assert.match(body, /<sb-edit slot="content" index="0" kind="block" name="sample-block"/);
    assert.match(body, /<sb-edit slot="content" index="1" kind="html"/);
    assert.match(body, /id="sb-edit-page"/);
    assert.match(body, /"path":"\/"/);
    assert.match(body, /"title":"Home"/);
    assert.match(body, /sb-edit:hover/);
    assert.match(body, /outline-color: #3b82f6/);
  });

  it("does not mark when ?edit=0", async () => {
    const { site } = createEditFixture();
    const body = await (await site.fetch(new Request("https://example.com/?edit=0"))).text();
    assert.doesNotMatch(body, /<sb-edit/);
  });

  it("includes normalized source attributes when provided", async () => {
    const { site } = createEditFixture();
    const body = await (await site.fetch(new Request("https://example.com/?edit=true"))).text();

    assert.match(
      body,
      new RegExp(`source="${normalizeSource("file:///pages/blocks/sample.ts")}"`),
    );
    assert.match(
      body,
      new RegExp(`page-source="${normalizeSource("file:///pages/home.ts")}"`),
    );
  });

  it("sets Cache-Control no-store and re-renders on each edit request", async () => {
    const { site, getBlockRenders } = createEditFixture();

    const first = await site.fetch(new Request("https://example.com/?edit=1"));
    assert.strictEqual(first.headers.get("Cache-Control"), "no-store");

    await site.fetch(new Request("https://example.com/?edit=1"));
    assert.strictEqual(getBlockRenders(), 2);
  });
});
