import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverBundledPlugins } from "./discover-bundled-plugins.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogStart = "<!-- plugin-catalog:start -->";
const catalogEnd = "<!-- plugin-catalog:end -->";

function buildCatalogTable(plugins) {
  const rows = plugins.map(({ dir, plugin }) => {
    const keywords = plugin.keywords.join(", ");
    const importPath = `@stackbox/cms/plugins/${dir}`;
    const instructions = `src/plugins/${dir}/AGENTS.md`;
    return `| ${dir} | \`${importPath}\` | ${keywords} | \`${instructions}\` |`;
  });

  return [
    "| Plugin | Import | Read when the user mentions | Instructions |",
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function injectCatalog(source, table) {
  const pattern = new RegExp(
    `${catalogStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${catalogEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
  );
  if (!pattern.test(source)) {
    throw new Error(
      "AGENTS.md is missing plugin catalog markers (<!-- plugin-catalog:start/end -->)",
    );
  }
  return source.replace(pattern, `${catalogStart}\n${table}\n${catalogEnd}`);
}

const templatePath = join(root, "AGENTS.md");
const source = readFileSync(templatePath, "utf8");
const bundledPlugins = await discoverBundledPlugins();
const generated = injectCatalog(source, buildCatalogTable(bundledPlugins));

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "AGENTS.md"), generated);
