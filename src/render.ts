import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSite } from "./build-site.js";
import { resolveSiteDist, resolveSiteRoot, urlPathToOutputFile } from "./paths.js";
import { isPage } from "./pages.js";
import { RenderError, renderPage } from "./render-page.js";
import { loadSite } from "./site.js";

function parseArgs(argv: string[]): {
  siteName: string;
  pagePath?: string;
  outPath?: string;
} {
  let siteName = "default";
  let pagePath: string | undefined;
  let outPath: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--site" && argv[i + 1]) {
      siteName = argv[++i]!;
    } else if (arg === "--out" && argv[i + 1]) {
      outPath = argv[++i];
    } else if (!arg.startsWith("-")) {
      pagePath = arg;
    }
  }

  return { siteName, pagePath, outPath };
}

async function renderSinglePage(
  pagePath: string,
  siteRoot: string,
  outPath?: string,
): Promise<void> {
  const site = await loadSite(siteRoot);
  const absolute = resolve(siteRoot, pagePath);
  const url = pathToFileURL(absolute).href;
  const imported = await import(url);
  const page = imported.default;

  if (!isPage(page)) {
    throw new RenderError(
      `${pagePath} must default-export a page from createPage()`,
    );
  }

  const html = await renderPage(page, siteRoot, site);

  if (outPath) {
    const absoluteOut = resolve(siteRoot, outPath);
    mkdirSync(dirname(absoluteOut), { recursive: true });
    writeFileSync(absoluteOut, html, "utf8");
    console.log(`Wrote ${outPath}`);
    return;
  }

  const outputFile = join(resolveSiteDist(siteRoot), urlPathToOutputFile(page.path));
  const absoluteOut = resolve(outputFile);
  mkdirSync(dirname(absoluteOut), { recursive: true });
  writeFileSync(absoluteOut, html, "utf8");
  console.log(`Wrote ${outputFile}`);
}

export async function runCli(): Promise<void> {
  const { siteName, pagePath, outPath } = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const siteRoot = resolveSiteRoot(repoRoot, siteName);

  if (!pagePath) {
    await buildSite(siteRoot);
    return;
  }

  await renderSinglePage(pagePath, siteRoot, outPath);
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  runCli().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
