import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { urlPathToOutputFile, resolveSiteDist } from "./paths.js";
import { isPage, isPageSource, type SitePage, type RenderContext } from "./pages.js";
import { renderPage } from "./render-page.js";
import { loadSite, type SiteSettings } from "./site.js";

export class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildError";
  }
}

function findPageFiles(pagesDir: string): string[] {
  const results: string[] = [];

  for (const entry of readdirSync(pagesDir)) {
    const full = join(pagesDir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findPageFiles(full));
    } else if (entry.endsWith(".ts")) {
      results.push(full);
    }
  }

  return results;
}

async function loadPagesFromEntry(
  entryPath: string,
  ctx: RenderContext,
): Promise<SitePage[]> {
  const url = pathToFileURL(entryPath).href;
  const imported = await import(url);
  const exported = imported.default;

  if (isPage(exported)) {
    return [exported];
  }

  if (isPageSource(exported)) {
    return exported.resolve(ctx);
  }

  const relativePath = relative(ctx.siteRoot, entryPath);
  throw new BuildError(
    `${relativePath} must default-export a Page or PageSource`,
  );
}

function assertUniquePaths(pages: SitePage[]): void {
  const seen = new Map<string, string>();

  for (const page of pages) {
    const existing = seen.get(page.path);
    if (existing) {
      throw new BuildError(
        `duplicate page path "${page.path}" (${existing} and another entry)`,
      );
    }
    seen.set(page.path, page.title);
  }
}

export type BuiltPage = {
  path: string;
  outputFile: string;
};

export async function collectPages(
  siteRoot: string,
  site: SiteSettings,
): Promise<SitePage[]> {
  const ctx: RenderContext = { siteRoot, site };
  const pagesDir = resolve(siteRoot, "pages");
  const entries = findPageFiles(pagesDir);
  const pages: SitePage[] = [];

  for (const entryPath of entries) {
    const entryPages = await loadPagesFromEntry(entryPath, ctx);
    pages.push(...entryPages);
  }

  assertUniquePaths(pages);
  return pages;
}

export async function buildSite(
  siteRoot: string,
  outDir = resolveSiteDist(siteRoot),
): Promise<BuiltPage[]> {
  const site = await loadSite(siteRoot);
  const pages = await collectPages(siteRoot, site);
  const absoluteOutDir = resolve(outDir);
  const built: BuiltPage[] = [];

  for (const page of pages) {
    const html = await renderPage(page, siteRoot, site);
    const outputFile = urlPathToOutputFile(page.path);
    const absolute = resolve(absoluteOutDir, outputFile);

    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, html, "utf8");
    built.push({ path: page.path, outputFile });
    console.log(`Wrote ${join(outDir, outputFile)}`);
  }

  return built;
}
