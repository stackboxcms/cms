import type { HSHtml } from "@hyperspan/html";
import type { Stackbox as SB } from "./types.js";

type BlockDef<TOptions = undefined> = {
  name: string;
  cache?: SB.CacheConfig;
  source?: string;
  render(options: TOptions, ctx?: SB.RenderContext): SB.BlockRenderResult;
};

function validateBlockName(name: string): void {
  if (!name || name.length === 0) {
    throw new Error("createBlock(def): name is required");
  }
}

export function createBlock<TOptions = undefined>(
  def: BlockDef<TOptions>,
): SB.BlockFactory<TOptions> {
  validateBlockName(def.name);

  if (typeof def.render !== "function") {
    throw new Error("createBlock(def): render is required");
  }

  return ((options?: TOptions) => ({
    __kind: "block" as const,
    name: def.name,
    ...(def.cache !== undefined ? { cache: def.cache } : {}),
    ...(def.source !== undefined ? { source: def.source } : {}),
    render: (ctx: SB.RenderContext) => def.render(options as TOptions, ctx),
  })) as SB.BlockFactory<TOptions>;
}

export function isBlock(value: unknown): value is SB.Block {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as SB.Block).__kind === "block" &&
    typeof (value as SB.Block).name === "string" &&
    (value as SB.Block).name.length > 0 &&
    typeof (value as SB.Block).render === "function"
  );
}
