import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPlugin,
} from "../../plugin.js";
import { normalizePathname } from "../../routing.js";
import type { Stackbox as SB } from "../../types.js";

export type SitemapOptions = {
  /** Site origin. Defaults to `siteConfig.config.url`. */
  baseUrl?: string;
  /** Extra site-relative or absolute URLs. */
  extraUrls?: readonly string[];
  exclude?: readonly string[] | ((path: string) => boolean);
};

function resolveBaseUrl(site: SB.Site, options: SitemapOptions): string {
  const raw = options.baseUrl ?? site.siteConfig.config.url;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("sb-sitemap: baseUrl or siteConfig.url is required");
  }
  const url = raw.trim().replace(/\/+$/, "");
  try {
    new URL(url);
  } catch {
    throw new Error(`sb-sitemap: invalid base URL "${raw}"`);
  }
  return url;
}

function isExcluded(path: string, options: SitemapOptions): boolean {
  const normalized = normalizePathname(path);
  if (!options.exclude) {
    return false;
  }
  if (typeof options.exclude === "function") {
    return options.exclude(normalized);
  }
  return options.exclude.some(
    (entry) => normalizePathname(entry) === normalized,
  );
}

function isNoindexPage(page: { meta?: { robots?: string } }): boolean {
  const robots = page.meta?.robots?.toLowerCase() ?? "";
  return robots.includes("noindex");
}

export function collectSitemapUrls(
  site: SB.Site,
  options: SitemapOptions = {},
): string[] {
  const base = resolveBaseUrl(site, options);
  const locs = new Set<string>();

  for (const page of site.pages) {
    if (isNoindexPage(page)) {
      continue;
    }
    if (isExcluded(page.path, options)) {
      continue;
    }
    locs.add(`${base}${normalizePathname(page.path)}`);
  }

  for (const extra of options.extraUrls ?? []) {
    if (extra.startsWith("http://") || extra.startsWith("https://")) {
      if (!isExcluded(extra, options)) {
        locs.add(extra);
      }
      continue;
    }
    const path = normalizePathname(extra);
    if (!isExcluded(path, options)) {
      locs.add(`${base}${path}`);
    }
  }

  return [...locs].sort();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderSitemapXml(
  site: SB.Site,
  options: SitemapOptions = {},
): string {
  const urls = collectSitemapUrls(site, options);
  const body = urls
    .map((loc) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function sitemapResponse(
  request: globalThis.Request,
  xml: string,
): globalThis.Response {
  const headers = { "content-type": "application/xml; charset=utf-8" };
  if (request.method === "HEAD") {
    const bytes = new TextEncoder().encode(xml);
    return new globalThis.Response(null, {
      status: 200,
      headers: { ...headers, "content-length": String(bytes.byteLength) },
    });
  }
  return new globalThis.Response(xml, { status: 200, headers });
}

function createSitemapRoutes(
  ctx: SB.PluginRouteContext,
  options: SitemapOptions,
) {
  return [
    {
      path: "/sitemap.xml",
      fetch(request: globalThis.Request) {
        const xml = renderSitemapXml(ctx.site, options);
        return sitemapResponse(request, xml);
      },
    },
  ] as const;
}

export function createSitemap(options: SitemapOptions = {}): SB.Plugin {
  return createPlugin({
    name: "sb-sitemap",
    description:
      "Generate sitemap.xml from site pages for search engines and static deploys.",
    version: "1.0.0",
    keywords: [
      "sitemap",
      "sitemap.xml",
      "seo",
      "search engines",
      "xml sitemap",
    ],
    root: import.meta.dirname,
    routes(ctx) {
      return createSitemapRoutes(ctx, options);
    },
    build(ctx) {
      const xml = renderSitemapXml(ctx.site, options);
      writeFileSync(join(ctx.publicDir, "sitemap.xml"), xml, "utf8");
    },
  });
}

export default createSitemap();
