import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { html } from "@hyperspan/html";
import { createBlock } from "../src/blocks.js";
import { createPage } from "../src/pages.js";
import { createPlugin } from "../src/plugin.js";
import { createSite, createSiteConfig, SiteError } from "../src/site.js";
import { createTemplate } from "../src/templates.js";

function createFixture() {
  const siteConfig = createSiteConfig({ name: "Plugin Hooks Test" });
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
      return html`<span>count-${blockRenders}</span>`;
    },
  })();

  const page = createPage(template, {
    path: "/",
    title: "Home",
    cache: { max: 60_000 },
    slots: { content: [counterBlock] },
  });

  return { siteConfig, page, getBlockRenders: () => blockRenders };
}

function pluginWithHooks(
  name: string,
  hooks: NonNullable<ReturnType<typeof createPlugin>["hooks"]>,
) {
  return createPlugin({
    name,
    description: `${name} plugin`,
    version: "1.0.0",
    keywords: [name],
    root: import.meta.dirname,
    hooks,
  });
}

describe("plugin hooks", () => {
  it("runs plugin afterRender when only plugins are registered", async () => {
    const { siteConfig, page } = createFixture();
    const plugin = pluginWithHooks("alpha", () => ({
      afterRender(html) {
        return html.replace("</body>", "<footer>plugin</footer></body>");
      },
    }));

    const site = createSite(siteConfig, {
      pages: [page],
      plugins: [plugin],
    });

    const body = await (await site.fetch(new Request("https://example.com/"))).text();
    assert.match(body, /<footer>plugin<\/footer>/);
  });

  it("composes two plugins in registration order", async () => {
    const { siteConfig, page } = createFixture();
    const first = pluginWithHooks("first", () => ({
      afterRender(html) {
        return html.replace("</body>", "<span id=\"first\"></span></body>");
      },
    }));
    const second = pluginWithHooks("second", () => ({
      afterRender(html) {
        return html.replace(
          "<span id=\"first\"></span>",
          "<span id=\"first\"></span><span id=\"second\"></span>",
        );
      },
    }));

    const site = createSite(siteConfig, {
      pages: [page],
      plugins: [first, second],
    });

    const body = await (await site.fetch(new Request("https://example.com/"))).text();
    assert.match(body, /<span id="first"><\/span><span id="second"><\/span>/);
  });

  it("runs site hooks after plugin hooks", async () => {
    const { siteConfig, page } = createFixture();
    const plugin = pluginWithHooks("alpha", () => ({
      afterRender(html) {
        return html.replace("</body>", "<span id=\"plugin\"></span></body>");
      },
    }));

    const site = createSite(siteConfig, {
      pages: [page],
      plugins: [plugin],
      hooks: {
        afterRender(html) {
          return html.replace(
            "<span id=\"plugin\"></span>",
            "<span id=\"plugin\"></span><span id=\"site\"></span>",
          );
        },
      },
    });

    const body = await (await site.fetch(new Request("https://example.com/"))).text();
    assert.match(body, /<span id="plugin"><\/span><span id="site"><\/span>/);
  });

  it("ANDs shouldCache across plugin and site hooks", async () => {
    const { siteConfig, page, getBlockRenders } = createFixture();
    const plugin = pluginWithHooks("alpha", () => ({
      shouldCache() {
        return false;
      },
    }));

    const site = createSite(siteConfig, {
      pages: [page],
      plugins: [plugin],
      hooks: {
        shouldCache: () => true,
      },
    });

    await site.fetch(new Request("https://example.com/"));
    await site.fetch(new Request("https://example.com/"));

    assert.strictEqual(getBlockRenders(), 2);
  });

  it("exposes site config to plugin hooks", async () => {
    const { siteConfig, page } = createFixture();
    let seenName: string | undefined;

    const plugin = pluginWithHooks("alpha", ({ site }) => {
      seenName = site.siteConfig.config.name as string;
      return {
        afterRender(html) {
          return html;
        },
      };
    });

    createSite(siteConfig, {
      pages: [page],
      plugins: [plugin],
    });

    assert.strictEqual(seenName, "Plugin Hooks Test");
  });

  it("throws when plugin hooks return a Promise", () => {
    const { siteConfig, page } = createFixture();
    const plugin = pluginWithHooks("async", () =>
      Promise.resolve({
        afterRender(html: string) {
          return html;
        },
      }),
    );

    assert.throws(
      () =>
        createSite(siteConfig, {
          pages: [page],
          plugins: [plugin],
        }),
      (error: unknown) =>
        error instanceof SiteError &&
        /plugin "async" hooks must return synchronously/.test(error.message),
    );
  });
});
