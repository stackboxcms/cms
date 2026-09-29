import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  copyRegisteredPluginAssets,
  createPlugin,
  isPlugin,
  PluginError,
} from "../src/plugin.js";

function validOptions(overrides: Record<string, unknown> = {}) {
  return {
    name: "demo",
    description: "A demo plugin",
    version: "1.0.0",
    keywords: ["demo"],
    root: import.meta.dirname,
    ...overrides,
  };
}

describe("createPlugin", () => {
  it("returns a plugin with required metadata", () => {
    const plugin = createPlugin(validOptions());
    assert.ok(isPlugin(plugin));
    assert.strictEqual(plugin.name, "demo");
    assert.strictEqual(plugin.description, "A demo plugin");
    assert.strictEqual(plugin.version, "1.0.0");
    assert.deepEqual(plugin.keywords, ["demo"]);
  });

  it("throws when required metadata is missing", () => {
    assert.throws(
      () => createPlugin(validOptions({ name: "" })),
      PluginError,
    );
    assert.throws(
      () => createPlugin(validOptions({ description: "  " })),
      PluginError,
    );
    assert.throws(
      () => createPlugin(validOptions({ version: "" })),
      PluginError,
    );
    assert.throws(
      () => createPlugin(validOptions({ keywords: [] })),
      PluginError,
    );
    assert.throws(
      () => createPlugin(validOptions({ keywords: ["ok", ""] })),
      PluginError,
    );
    assert.throws(
      () => createPlugin(validOptions({ root: "" })),
      PluginError,
    );
  });

  it("throws when name is not a single path segment", () => {
    assert.throws(
      () => createPlugin(validOptions({ name: "foo/bar" })),
      PluginError,
    );
  });
});

describe("copyRegisteredPluginAssets", () => {
  it("copies only the registered plugin public_assets", () => {
    const workspace = mkdtempSync(join(tmpdir(), "stackbox-plugin-"));
    const pluginRoot = join(workspace, "my-plugin");
    const publicAssets = join(pluginRoot, "public_assets");
    const destPublic = join(workspace, "public");
    mkdirSync(publicAssets, { recursive: true });
    writeFileSync(join(publicAssets, "hello.txt"), "hello from plugin");

    const plugin = createPlugin({
      name: "my-plugin",
      description: "Test plugin",
      version: "0.1.0",
      keywords: ["test"],
      root: pluginRoot,
    });

    try {
      copyRegisteredPluginAssets([plugin], destPublic);
      const copied = join(destPublic, "_sb", "plugins", "my-plugin", "hello.txt");
      assert.strictEqual(readFileSync(copied, "utf8"), "hello from plugin");

      copyRegisteredPluginAssets([], destPublic);
      assert.ok(
        readFileSync(copied, "utf8") === "hello from plugin",
        "empty registration must not copy extra plugins",
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
