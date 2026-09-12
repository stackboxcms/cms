import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDistDir = join(root, "dist", "plugins");

/**
 * Discover bundled plugins from dist/plugins/<dir>/index.js after compile.
 * Each folder under src/plugins/ with a default-exported createPlugin() registration
 * is included automatically — no manual registry to maintain.
 */
export async function discoverBundledPlugins() {
  if (!existsSync(pluginsDistDir)) {
    throw new Error(
      "discoverBundledPlugins(): dist/plugins not found — compile the package first",
    );
  }

  const entries = [];

  for (const dir of readdirSync(pluginsDistDir).sort()) {
    const pluginDir = join(pluginsDistDir, dir);
    if (!statSync(pluginDir).isDirectory()) {
      continue;
    }

    const indexJs = join(pluginDir, "index.js");
    if (!existsSync(indexJs)) {
      continue;
    }

    const mod = await import(pathToFileURL(indexJs).href);
    const plugin = mod.default;
    if (
      !plugin ||
      typeof plugin !== "object" ||
      plugin.__kind !== "plugin" ||
      !Array.isArray(plugin.keywords) ||
      plugin.keywords.length === 0
    ) {
      throw new Error(
        `discoverBundledPlugins(): dist/plugins/${dir}/index.js must default-export createPlugin() with keywords`,
      );
    }

    entries.push({ dir, plugin });
  }

  if (entries.length === 0) {
    throw new Error(
      "discoverBundledPlugins(): no plugins found in dist/plugins/",
    );
  }

  return entries;
}
