import type { Page, PageSource, RenderContext, SitePage } from "./pages.js";
import type { HSHtml } from "@hyperspan/html";
import type { TemplateDescriptor } from "./templates.js";

export type ModuleRenderResult = HSHtml | Promise<HSHtml>;

export type Module = {
  readonly __kind: "module";
  readonly name: string;
  render(ctx: RenderContext): ModuleRenderResult;
};

type ModuleDef<TOptions = undefined> = {
  name: string;
  render(options: TOptions, ctx?: RenderContext): ModuleRenderResult;
  resolvePages?: (
    options: TOptions & { template: TemplateDescriptor<string, string> },
    ctx: RenderContext,
  ) => SitePage[] | Promise<SitePage[]>;
};

export type ModuleOptionsOf<F> = F extends (options?: infer O) => unknown
  ? [O] extends [undefined]
    ? undefined
    : O
  : never;

export type ModuleFactory<TOptions = undefined> = ((
  options?: TOptions,
) => Module) & {
  source?: (
    options: TOptions & { template: TemplateDescriptor<string, string> },
  ) => PageSource;
};

type ModuleFactoryWithSource<TOptions> = ModuleFactory<TOptions> & {
  source: (options: TOptions & { template: TemplateDescriptor<string, string> }) => PageSource;
};

function validateModuleName(name: string): void {
  if (!name || name.length === 0) {
    throw new Error("createModule(def): name is required");
  }
}

export function createModule<TOptions = undefined>(
  def: ModuleDef<TOptions>,
): TOptions extends undefined
  ? ModuleFactory<undefined>
  : ModuleFactoryWithSource<TOptions> {
  validateModuleName(def.name);

  if (typeof def.render !== "function") {
    throw new Error("createModule(def): render is required");
  }

  const factory = ((options?: TOptions) => ({
    __kind: "module" as const,
    name: def.name,
    render: (ctx: RenderContext) => def.render(options as TOptions, ctx),
  })) as ModuleFactory<TOptions>;

  if (def.resolvePages) {
    const withSource = factory as ModuleFactoryWithSource<TOptions>;
    withSource.source = (
      options: TOptions & { template: TemplateDescriptor<string, string> },
    ) => ({
      __kind: "pageSource" as const,
      resolve: (ctx) => def.resolvePages!(options, ctx),
    });
    return withSource as TOptions extends undefined
      ? ModuleFactory<undefined>
      : ModuleFactoryWithSource<TOptions>;
  }

  return factory as TOptions extends undefined
    ? ModuleFactory<undefined>
    : ModuleFactoryWithSource<TOptions>;
}

export function isModule(value: unknown): value is Module {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Module).__kind === "module" &&
    typeof (value as Module).name === "string" &&
    (value as Module).name.length > 0 &&
    typeof (value as Module).render === "function"
  );
}
