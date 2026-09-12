import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { html } from "@hyperspan/html";
import {
  build,
  BuildError,
  parseBuildCliArgs,
  resolveBuildSettings,
  runBuildCli,
} from "../src/build.js";
import { createPage } from "../src/pages.js";
import randomQuotePlugin from "../src/plugins/random-quote/index.js";
import { createSite, createSiteConfig } from "../src/site.js";
import { createTemplate } from "../src/templates.js";

function createHomeSite() {
  const siteConfig = createSiteConfig({ name: "Build Test" });
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
  return createSite(siteConfig, {
    pages: [homePage],
    plugins: [randomQuotePlugin],
  });
}

describe("resolveBuildSettings", () => {
  it("defaults outDir to dist and publicDir to dist/public", () => {
    const settings = resolveBuildSettings({});
    assert.ok(settings.outDir.endsWith("/dist"));
    assert.ok(settings.publicDir.endsWith("/dist/public"));
  });

  it("uses a custom outDir and derives publicDir from it", () => {
    const settings = resolveBuildSettings({ outDir: "build-output" });
    assert.ok(settings.outDir.endsWith("/build-output"));
    assert.ok(settings.publicDir.endsWith("/build-output/public"));
  });
});

describe("build", () => {
  it("copies registered plugin public_assets into publicDir", async () => {
    const dest = mkdtempSync(join(tmpdir(), "stackbox-build-"));
    try {
      const result = await build({
        site: createHomeSite(),
        outDir: join(dest, "out"),
        publicDir: join(dest, "public"),
      });

      assert.strictEqual(result.plugins.length, 1);
      assert.strictEqual(result.plugins[0]!.name, "sb-random-quote");
      const css = join(
        dest,
        "public",
        "_sb",
        "plugins",
        "sb-random-quote",
        "widget.css",
      );
      assert.match(readFileSync(css, "utf8"), /data-block="random-quote"/);
      assert.ok(existsSync(join(dest, "out")));
      assert.ok(!existsSync(join(dest, "public", "_sb", "plugins", "sb-blog")));
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it("throws when site is missing", async () => {
    await assert.rejects(() => build({} as never), BuildError);
  });
});

describe("stackbox-cms build CLI", () => {
  it("parses build flags", () => {
    const args = parseBuildCliArgs([
      "node",
      "stackbox-cms",
      "build",
      "--site",
      "server.ts",
      "--outDir",
      "dist",
      "--publicDir",
      "dist/public",
    ]);
    assert.strictEqual(args.command, "build");
    assert.strictEqual(args.site, "server.ts");
    assert.strictEqual(args.outDir, "dist");
    assert.strictEqual(args.publicDir, "dist/public");
  });

  it("parses --outDir", () => {
    const args = parseBuildCliArgs([
      "node",
      "stackbox-cms",
      "build",
      "--outDir",
      "build",
    ]);
    assert.strictEqual(args.outDir, "build");
  });

  it("loads the site entry and copies registered plugin assets", async () => {
    const dest = mkdtempSync(join(tmpdir(), "stackbox-cli-"));
    try {
      const result = await runBuildCli(
        [
          "node",
          "stackbox-cms",
          "build",
          "--site",
          join(import.meta.dirname, "fixtures/build-site.ts"),
          "--outDir",
          join(dest, "dist"),
          "--publicDir",
          join(dest, "public"),
        ],
        dest,
      );
      assert.strictEqual(result.plugins[0]!.name, "sb-random-quote");
      assert.match(
        readFileSync(
          join(dest, "public", "_sb", "plugins", "sb-random-quote", "widget.css"),
          "utf8",
        ),
        /data-block="random-quote"/,
      );
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});
