import type { RenderContext } from "./pages.js";
import type { HSHtml } from "@hyperspan/html";

export type ModuleRenderResult = HSHtml | Promise<HSHtml>;

export type Module = {
  readonly __kind: "module";
  readonly name: string;
  render(ctx: RenderContext): ModuleRenderResult;
};

type ModuleDef<TOptions = undefined> = {
  name: string;
  render(options: TOptions, ctx?: RenderContext): ModuleRenderResult;
};

export type ModuleOptionsOf<F> = F extends (options?: infer O) => unknown
  ? [O] extends [undefined]
    ? undefined
    : O
  : never;

export type ModuleFactory<TOptions = undefined> = (
  options?: TOptions,
) => Module;

function validateModuleName(name: string): void {
  if (!name || name.length === 0) {
    throw new Error("createModule(def): name is required");
  }
}

export function createModule<TOptions = undefined>(
  def: ModuleDef<TOptions>,
): ModuleFactory<TOptions> {
  validateModuleName(def.name);

  if (typeof def.render !== "function") {
    throw new Error("createModule(def): render is required");
  }

  return ((options?: TOptions) => ({
    __kind: "module" as const,
    name: def.name,
    render: (ctx: RenderContext) => def.render(options as TOptions, ctx),
  })) as ModuleFactory<TOptions>;
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
