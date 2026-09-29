import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import blogPlugin from "../src/plugins/blog/index.js";
import randomQuotePlugin from "../src/plugins/random-quote/index.js";
import sitemapPlugin from "../src/plugins/sitemap/index.js";

function countBundledPluginDirs(): number {
  const pluginsDir = join(import.meta.dirname, "../dist/plugins");
  return readdirSync(pluginsDir).filter((name) =>
    statSync(join(pluginsDir, name)).isDirectory(),
  ).length;
}

describe("dist/AGENTS.md", () => {
  it("exists after package build", () => {
    const path = join(import.meta.dirname, "../dist/AGENTS.md");
    assert.ok(existsSync(path));
  });

  it("includes a catalog row for every bundled plugin", () => {
    const md = readFileSync(
      join(import.meta.dirname, "../dist/AGENTS.md"),
      "utf8",
    );
    const bundledCount = countBundledPluginDirs();
    const catalogRows = md.match(/^\| [^|]+ \| `@stackbox\/cms\/plugins\//gm);
    assert.ok(catalogRows);
    assert.strictEqual(
      catalogRows!.length,
      bundledCount,
      "catalog must list every folder in dist/plugins/",
    );
  });

  it("includes keywords from each discovered plugin", () => {
    const md = readFileSync(
      join(import.meta.dirname, "../dist/AGENTS.md"),
      "utf8",
    );

    for (const plugin of [blogPlugin, randomQuotePlugin, sitemapPlugin]) {
      for (const keyword of plugin.keywords) {
        assert.match(
          md,
          new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
          `missing keyword "${keyword}" from ${plugin.name}`,
        );
      }
    }

    assert.match(md, /node_modules\/@stackbox\/cms\/dist\/AGENTS\.md/);
    assert.match(md, /@stackbox\/cms\/plugins\/blog/);
    assert.match(md, /src\/plugins\/sitemap\/AGENTS\.md/);
  });
});
