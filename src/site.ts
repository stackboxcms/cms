import type { SitePage } from "./pages.js";
import { isPage } from "./pages.js";
import { renderPage } from "./render-page.js";
import { normalizePathname } from "./routing.js";
import { createContext } from "./stackbox/context.js";

export type SiteConfig<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  readonly __kind: "siteConfig";
  readonly config: T;
};

export type Site<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  readonly __kind: "site";
  readonly siteConfig: SiteConfig<T>;
  readonly pages: readonly SitePage[];
  fetch(
    request: globalThis.Request,
    env?: Record<string, unknown>,
  ): Promise<globalThis.Response>;
};

export class SiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteError";
  }
}

function validateConfigObject(config: unknown, label: string): void {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new SiteError(`${label}: config must be a non-null object`);
  }
  if (Object.keys(config).length === 0) {
    throw new SiteError(`${label}: config must not be empty`);
  }
}

export function createSiteConfig<T extends Record<string, unknown>>(
  config: T,
): SiteConfig<T> {
  validateConfigObject(config, "createSiteConfig(config)");
  return {
    __kind: "siteConfig" as const,
    config,
  };
}

export function isSiteConfig(value: unknown): value is SiteConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as SiteConfig).__kind === "siteConfig" &&
    typeof (value as SiteConfig).config === "object" &&
    (value as SiteConfig).config !== null &&
    !Array.isArray((value as SiteConfig).config)
  );
}

function assertUniquePaths(pages: SitePage[]): void {
  const seen = new Map<string, string>();

  for (const page of pages) {
    const existing = seen.get(page.path);
    if (existing) {
      throw new SiteError(
        `duplicate page path "${page.path}" (${existing} and ${page.title})`,
      );
    }
    seen.set(page.path, page.title);
  }
}

function buildPageMap(pages: readonly SitePage[]): Map<string, SitePage> {
  const map = new Map<string, SitePage>();
  for (const page of pages) {
    map.set(normalizePathname(page.path), page);
  }
  return map;
}

export function createSite<T extends Record<string, unknown>>(
  siteConfig: SiteConfig<T>,
  options: { pages: [SitePage, ...SitePage[]] },
): Site<T> {
  if (!isSiteConfig(siteConfig)) {
    throw new SiteError(
      "createSite(siteConfig, options): siteConfig must be from createSiteConfig()",
    );
  }

  const { pages } = options;
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new SiteError(
      "createSite(siteConfig, options): pages must be a non-empty array",
    );
  }

  for (const page of pages) {
    if (!isPage(page)) {
      throw new SiteError(
        "createSite(siteConfig, options): every page must be from createPage()",
      );
    }
  }

  assertUniquePaths(pages);

  const pageMap = buildPageMap(pages);

  return {
    __kind: "site" as const,
    siteConfig,
    pages,
    async fetch(request, env = {}) {
      const ctx = createContext(request, env);
      const method = ctx.req.method;

      if (method !== "GET" && method !== "HEAD") {
        return ctx.res.text("Method Not Allowed", { status: 405 });
      }

      const pathname = normalizePathname(ctx.req.url.pathname);
      const page = pageMap.get(pathname);

      if (!page) {
        return ctx.res.notFound();
      }

      const html = await renderPage(page, siteConfig, ctx);

      if (method === "HEAD") {
        return ctx.res.html("", { status: 200 });
      }

      return ctx.res.html(html);
    },
  };
}

export function isSite(value: unknown): value is Site {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Site).__kind === "site" &&
    isSiteConfig((value as Site).siteConfig) &&
    Array.isArray((value as Site).pages) &&
    typeof (value as Site).fetch === "function"
  );
}
