import {
  buildPageCacheKey,
  cacheControlFresh,
  cacheControlStale,
  collectPageCacheConfigs,
  createMemoryCache,
  isCacheEntryFresh,
  isPageCacheDisabled,
  isSuccessfulRender,
  resolvePageCacheTtlMs,
  type CacheAdapter,
} from "./cache.js";
import type { SiteHooks } from "./hooks.js";
import type { SitePage } from "./pages.js";
import { isPage } from "./pages.js";
import { renderPage } from "./render-page.js";
import { servePluginAsset } from "./link.js";
import {
  assertPlugin,
  type Plugin,
  type PluginRoute,
} from "./plugin.js";
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
  readonly plugins: readonly Plugin[];
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

function assertUniquePluginNames(plugins: readonly Plugin[]): void {
  const seen = new Set<string>();
  for (const plugin of plugins) {
    if (seen.has(plugin.name)) {
      throw new SiteError(
        `createSite(siteConfig, options): duplicate plugin name "${plugin.name}"`,
      );
    }
    seen.add(plugin.name);
  }
}

function collectPluginRoutes(
  plugins: readonly Plugin[],
  site: Site,
  pagePaths: ReadonlySet<string>,
): Map<string, PluginRoute["fetch"]> {
  const routes = new Map<string, PluginRoute["fetch"]>();

  for (const plugin of plugins) {
    if (!plugin.routes) {
      continue;
    }

    const declared = plugin.routes({ site });
    if (declared instanceof Promise) {
      throw new SiteError(
        `createSite(siteConfig, options): plugin "${plugin.name}" routes must return synchronously`,
      );
    }

    for (const route of declared) {
      const path = normalizePathname(route.path);
      if (pagePaths.has(path)) {
        throw new SiteError(
          `createSite(siteConfig, options): plugin route "${path}" conflicts with a page path`,
        );
      }
      if (routes.has(path)) {
        throw new SiteError(
          `createSite(siteConfig, options): duplicate plugin route "${path}"`,
        );
      }
      routes.set(path, route.fetch);
    }
  }

  return routes;
}

export function createSite<T extends Record<string, unknown>>(
  siteConfig: SiteConfig<T>,
  options: {
    pages: [SitePage, ...SitePage[]];
    plugins?: readonly Plugin[];
    cacheAdapter?: CacheAdapter;
    hooks?: SiteHooks;
  },
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

  const plugins = options.plugins ?? [];
  if (!Array.isArray(plugins)) {
    throw new SiteError(
      "createSite(siteConfig, options): plugins must be an array of createPlugin() results",
    );
  }
  for (const plugin of plugins) {
    try {
      assertPlugin(plugin, "createSite(siteConfig, options)");
    } catch (error) {
      throw new SiteError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  assertUniquePluginNames(plugins);

  assertUniquePaths(pages);

  const pageMap = buildPageMap(pages);
  const pagePaths = new Set(pageMap.keys());

  const siteShell: Site<T> = {
    __kind: "site" as const,
    siteConfig,
    pages,
    plugins,
    async fetch() {
      return new globalThis.Response("Site not ready", { status: 500 });
    },
  };

  const pluginRoutes = collectPluginRoutes(plugins, siteShell, pagePaths);
  const cacheAdapter = options.cacheAdapter ?? createMemoryCache();
  const hooks = options.hooks;
  const inFlightRenders = new Map<string, Promise<string>>();

  async function applyBeforeResponse(
    response: globalThis.Response,
    request: globalThis.Request,
    ctx: ReturnType<typeof createContext>,
    page?: SitePage,
  ): Promise<globalThis.Response> {
    if (!hooks?.beforeResponse) {
      return response;
    }
    return hooks.beforeResponse(response, { request, page, ctx });
  }

  async function renderAndStore(
    key: string,
    page: SitePage,
    ctx: ReturnType<typeof createContext>,
    ttlMs: number,
  ): Promise<string> {
    const existing = inFlightRenders.get(key);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      const html = await renderPage(page, siteConfig, ctx, hooks);
      if (isSuccessfulRender(html)) {
        await cacheAdapter.set(key, {
          html,
          expiresAt: Date.now() + ttlMs,
        });
      }
      return html;
    })();

    inFlightRenders.set(key, promise);

    try {
      return await promise;
    } finally {
      if (inFlightRenders.get(key) === promise) {
        inFlightRenders.delete(key);
      }
    }
  }

  function startBackgroundRefresh(
    key: string,
    page: SitePage,
    ctx: ReturnType<typeof createContext>,
    ttlMs: number,
  ): void {
    if (inFlightRenders.has(key)) {
      return;
    }

    void renderAndStore(key, page, ctx, ttlMs).catch(() => {
      // Keep serving the last good HTML on refresh failure.
    });
  }

  async function respondWithHtml(
    html: string,
    method: string,
    cacheControl: string,
    ctx: ReturnType<typeof createContext>,
  ): Promise<globalThis.Response> {
    const headers = { "Cache-Control": cacheControl };
    if (method === "HEAD") {
      return ctx.res.html("", { status: 200, headers });
    }
    return ctx.res.html(html, { status: 200, headers });
  }

  return {
    __kind: "site" as const,
    siteConfig,
    pages,
    plugins,
    async fetch(request, env = {}) {
      const ctx = createContext(request, env);
      const method = ctx.req.method;
      const pathname = normalizePathname(ctx.req.url.pathname);

      const pluginRoute = pluginRoutes.get(pathname);
      if (pluginRoute) {
        return pluginRoute(request, ctx);
      }

      if (method !== "GET" && method !== "HEAD") {
        return ctx.res.text("Method Not Allowed", { status: 405 });
      }

      const pluginAsset = servePluginAsset(pathname, method, plugins);
      if (pluginAsset) {
        return pluginAsset;
      }

      const page = pageMap.get(pathname);

      if (!page) {
        return applyBeforeResponse(
          await ctx.res.notFound(),
          request,
          ctx,
        );
      }

      const cacheKey = buildPageCacheKey(pathname, ctx.req.url.search);
      const cacheConfigs = collectPageCacheConfigs(page, siteConfig);
      const hookAllowsCache = hooks?.shouldCache
        ? hooks.shouldCache(request)
        : true;

      async function respondForPage(
        html: string,
        cacheControl: string,
      ): Promise<globalThis.Response> {
        return applyBeforeResponse(
          await respondWithHtml(html, method, cacheControl, ctx),
          request,
          ctx,
          page,
        );
      }

      if (isPageCacheDisabled(cacheConfigs) || !hookAllowsCache) {
        const html = await renderPage(page, siteConfig, ctx, hooks);
        return respondForPage(html, "no-store");
      }

      const ttlMs = resolvePageCacheTtlMs(cacheConfigs);
      const cached = await cacheAdapter.get(cacheKey);

      if (cached && isCacheEntryFresh(cached)) {
        return respondForPage(cached.html, cacheControlFresh(ttlMs));
      }

      if (cached) {
        startBackgroundRefresh(cacheKey, page, ctx, ttlMs);
        return respondForPage(cached.html, cacheControlStale(ttlMs));
      }

      const html = await renderAndStore(cacheKey, page, ctx, ttlMs);
      return respondForPage(html, cacheControlFresh(ttlMs));
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
    Array.isArray((value as Site).plugins) &&
    typeof (value as Site).fetch === "function"
  );
}
