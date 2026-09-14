import { html, type HSHtml } from "@hyperspan/html";
import type { z } from "zod";

type HtmlSafe = ReturnType<typeof html.raw>;

export namespace Stackbox {
  export type CookieOptions = {
    maxAge?: number;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | true;
  };

  export type Cookies = {
    _req: globalThis.Request;
    _responseHeaders: Headers | undefined;
    _parsedCookies: Record<string, string>;
    _encrypt: ((str: string) => string) | undefined;
    _decrypt: ((str: string) => string) | undefined;
    get: (name: string) => string | undefined;
    set: (name: string, value: string, options?: CookieOptions) => void;
    delete: (name: string) => void;
  };

  export type Request = {
    url: URL;
    raw: globalThis.Request;
    method: string;
    headers: Headers;
    query: URLSearchParams;
    cookies: Cookies;
    text: () => Promise<string>;
    json: <T = unknown>() => Promise<T>;
    formData: () => Promise<FormData>;
    urlencoded: () => Promise<URLSearchParams>;
  };

  export type Response = {
    cookies: Cookies;
    headers: Headers;
    status: number | undefined;
    html: (
      html: string,
      options?: ResponseInit,
    ) => Promise<globalThis.Response>;
    json: (
      json: unknown,
      options?: ResponseInit,
    ) => Promise<globalThis.Response>;
    text: (
      text: string,
      options?: ResponseInit,
    ) => Promise<globalThis.Response>;
    redirect: (
      url: string,
      options?: ResponseInit,
    ) => Promise<globalThis.Response>;
    error: (
      error: Error,
      options?: ResponseInit,
    ) => Promise<globalThis.Response>;
    notFound: (options?: ResponseInit) => Promise<globalThis.Response>;
    merge: (response: globalThis.Response) => Promise<globalThis.Response>;
  };

  export interface Context<
    TEnv extends Record<string, unknown> = Record<string, unknown>,
  > {
    env: TEnv;
    req: Request;
    res: Response;
  }

  export type CacheBounds = { min?: number; max?: number };

  export type CacheConfig = CacheBounds | false;

  export type CacheEntry = {
    html: string;
    expiresAt: number;
  };

  export type CacheAdapter = {
    get(key: string): CacheEntry | undefined | Promise<CacheEntry | undefined>;
    set(key: string, entry: CacheEntry): void | Promise<void>;
  };

  export type SiteConfig<
    T extends Record<string, unknown> = Record<string, unknown>,
  > = {
    readonly __kind: "siteConfig";
    readonly config: T;
  };

  export type BlockRenderResult = HSHtml | Promise<HSHtml>;

  export type RenderContext = {
    siteConfig: SiteConfig;
    ctx?: Context;
    page?: SitePage;
    hooks?: SiteHooks;
  };

  export type Block = {
    readonly __kind: "block";
    readonly name: string;
    readonly cache?: CacheConfig;
    readonly source?: string;
    render(ctx: RenderContext): BlockRenderResult;
  };

  export type BlockOptionsOf<F> = F extends (options?: infer O) => unknown
    ? [O] extends [undefined]
      ? undefined
      : O
    : never;

  export type BlockFactory<TOptions = undefined> = (
    options?: TOptions,
  ) => Block;

  export type DefaultSlotContent = Block | string;

  export type SlotOptions = {
    required?: boolean;
    primary?: true;
    schema?: z.ZodTypeAny;
  };

  export type SlotDefinition = {
    name: string;
    options?: SlotOptions;
  };

  export type SlotMeta = {
    isDefault: boolean;
    required: boolean;
    schema?: z.ZodTypeAny;
  };

  export type SlotNamesFrom<S extends readonly SlotDefinition[]> =
    S[number]["name"];

  export type RequiredSlotNamesFrom<S extends readonly SlotDefinition[]> =
    Extract<
      S[number],
      { options: { required: true } } | { options: { primary: true } }
    >["name"];

  export type SlotContentFromDefinition<D extends SlotDefinition> =
    D extends { options: { schema: infer Schema extends z.ZodTypeAny } }
      ? z.input<Schema>
      : DefaultSlotContent;

  export type PageSlotsInput<
    S extends readonly SlotDefinition[],
    Required extends string,
  > = {
    [K in Required]: SlotContentFromDefinition<
      Extract<S[number], { name: K }>
    >[];
  } & Partial<{
    [K in Exclude<SlotNamesFrom<S>, Required>]: SlotContentFromDefinition<
      Extract<S[number], { name: K }>
    >[];
  }>;

  export type SlotRenderValue = HSHtml | HtmlSafe | Promise<HSHtml>;

  export type Slot<
    TContent = DefaultSlotContent,
    D extends SlotDefinition = SlotDefinition,
  > = {
    readonly name: D["name"];
    readonly definition: D;
    readonly content: readonly TContent[];
    render(): SlotRenderValue;
  };

  export type TemplateSlotsFrom<S extends readonly SlotDefinition[]> = {
    [K in SlotNamesFrom<S>]: Slot<
      SlotContentFromDefinition<Extract<S[number], { name: K }>>,
      Extract<S[number], { name: K }>
    >;
  };

  export type PageMeta = {
    description?: string;
    robots?: string;
    canonical?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
  };

  export type Page<
    Slots extends string = string,
    RequiredSlots extends Slots = never,
    Definitions extends readonly SlotDefinition[] = readonly SlotDefinition[],
  > = {
    readonly __kind: "page";
    path: string;
    template: TemplateDescriptor<Slots, RequiredSlots, Definitions>;
    title: string;
    meta?: PageMeta;
    cache?: CacheConfig;
    source?: string;
    slots: PageSlotsInput<Definitions, RequiredSlots>;
  };

  export type SitePage = {
    readonly __kind: "page";
    path: string;
    template: TemplateDescriptor<string, string>;
    title: string;
    meta?: PageMeta;
    cache?: CacheConfig;
    source?: string;
    slots: Partial<Record<string, DefaultSlotContent[]>>;
  };

  export type PageRenderView = Omit<Page, "template" | "slots">;

  export type TemplateRenderContext<
    S extends readonly SlotDefinition[] = readonly SlotDefinition[],
  > = {
    head?: HSHtml;
    siteConfig: SiteConfig;
    page: PageRenderView;
    slots: TemplateSlotsFrom<S>;
  };

  export type TemplateRenderFn = (ctx: {
    head?: HSHtml;
    siteConfig: SiteConfig;
    page: PageRenderView;
    slots: Record<string, Slot>;
  }) => HSHtml;

  export type TemplateDescriptor<
    Slots extends string = string,
    RequiredSlots extends Slots = never,
    Definitions extends readonly SlotDefinition[] = readonly SlotDefinition[],
  > = {
    readonly __kind: "template";
    siteConfig: SiteConfig;
    formatPageTitle: (title: string) => string;
    render: TemplateRenderFn;
    slots: Record<Slots, SlotMeta>;
    requiredSlots: readonly RequiredSlots[];
    readonly __definitions?: Definitions;
  };

  export type PluginRoute = {
    path: string;
    fetch: (
      request: globalThis.Request,
      ctx: Context,
    ) => globalThis.Response | Promise<globalThis.Response>;
  };

  export type PluginRouteContext = {
    site: Site;
  };

  export type PluginBuildContext = {
    site: Site;
    outDir: string;
    publicDir: string;
  };

  export type Plugin = {
    readonly __kind: "plugin";
    readonly name: string;
    readonly description: string;
    readonly version: string;
    readonly keywords: readonly string[];
    readonly root: string;
    readonly assetsDir: string;
    readonly publicAssetsDir: string;
    routes?: (
      ctx: PluginRouteContext,
    ) => readonly PluginRoute[] | Promise<readonly PluginRoute[]>;
    build?: (ctx: PluginBuildContext) => void | Promise<void>;
  };

  export type CreatePluginOptions = {
    name: string;
    description: string;
    version: string;
    keywords: readonly string[];
    root: string;
    routes?: (
      ctx: PluginRouteContext,
    ) => readonly PluginRoute[] | Promise<readonly PluginRoute[]>;
    build?: (ctx: PluginBuildContext) => void | Promise<void>;
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

  export type RenderSlotItemInfo = {
    item: Block | string;
    slot: string;
    index: number;
    page: SitePage;
    ctx?: Context;
  };

  export type AfterRenderInfo = {
    page: SitePage;
    ctx?: Context;
  };

  export type BeforeResponseInfo = {
    request: globalThis.Request;
    page?: SitePage;
    ctx: Context;
  };

  export type SiteHooks = {
    shouldCache?: (request: globalThis.Request) => boolean;
    renderSlotItem?: (
      html: string,
      info: RenderSlotItemInfo,
    ) => string | Promise<string>;
    afterRender?: (
      html: string,
      info: AfterRenderInfo,
    ) => string | Promise<string>;
    beforeResponse?: (
      response: globalThis.Response,
      info: BeforeResponseInfo,
    ) => globalThis.Response | Promise<globalThis.Response>;
  };

  export type BuildSettings = {
    readonly outDir: string;
    readonly publicDir: string;
  };

  export type BuildOptions = {
    site: Site;
    outDir?: string;
    publicDir?: string;
  };

  export type BuildResult = {
    readonly settings: BuildSettings;
    readonly plugins: readonly Plugin[];
  };

  export type BuildCliArgs = {
    readonly command: "build";
    readonly site?: string;
    readonly outDir?: string;
    readonly publicDir?: string;
  };

  export type PluginAssetRequest = {
    plugin: string;
    relativePath: string;
  };
}
