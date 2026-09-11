import type { RenderContext } from "./pages.js";
import type { HSHtml } from "@hyperspan/html";

export type BlockRenderResult = HSHtml | Promise<HSHtml>;

export type Block = {
  readonly __kind: "block";
  readonly name: string;
  render(ctx: RenderContext): BlockRenderResult;
};

type BlockDef<TOptions = undefined> = {
  name: string;
  render(options: TOptions, ctx?: RenderContext): BlockRenderResult;
};

export type BlockOptionsOf<F> = F extends (options?: infer O) => unknown
  ? [O] extends [undefined]
    ? undefined
    : O
  : never;

export type BlockFactory<TOptions = undefined> = (
  options?: TOptions,
) => Block;

function validateBlockName(name: string): void {
  if (!name || name.length === 0) {
    throw new Error("createBlock(def): name is required");
  }
}

export function createBlock<TOptions = undefined>(
  def: BlockDef<TOptions>,
): BlockFactory<TOptions> {
  validateBlockName(def.name);

  if (typeof def.render !== "function") {
    throw new Error("createBlock(def): render is required");
  }

  return ((options?: TOptions) => ({
    __kind: "block" as const,
    name: def.name,
    render: (ctx: RenderContext) => def.render(options as TOptions, ctx),
  })) as BlockFactory<TOptions>;
}

export function isBlock(value: unknown): value is Block {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Block).__kind === "block" &&
    typeof (value as Block).name === "string" &&
    (value as Block).name.length > 0 &&
    typeof (value as Block).render === "function"
  );
}
