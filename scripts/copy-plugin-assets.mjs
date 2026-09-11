import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = join(root, "src/plugins");

if (!existsSync(pluginsDir)) {
  process.exit(0);
}

for (const name of readdirSync(pluginsDir)) {
  const pluginDir = join(pluginsDir, name);
  if (!statSync(pluginDir).isDirectory()) {
    continue;
  }

  const publicAssets = join(pluginDir, "public_assets");
  if (!existsSync(publicAssets)) {
    continue;
  }

  const publicDest = join(root, "dist/public/_sb/plugins", name);
  mkdirSync(dirname(publicDest), { recursive: true });
  cpSync(publicAssets, publicDest, { recursive: true });

  const importDest = join(root, "dist/plugins", name, "public_assets");
  mkdirSync(dirname(importDest), { recursive: true });
  cpSync(publicAssets, importDest, { recursive: true });
}
