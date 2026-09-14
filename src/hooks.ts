import type { Block } from "./blocks.js";
import type { SitePage } from "./pages.js";
import type { Stackbox } from "./stackbox/context.js";

export type RenderSlotItemInfo = {
  item: Block | string;
  slot: string;
  index: number;
  page: SitePage;
  ctx?: Stackbox.Context;
};

export type AfterRenderInfo = {
  page: SitePage;
  ctx?: Stackbox.Context;
};

export type BeforeResponseInfo = {
  request: globalThis.Request;
  page?: SitePage;
  ctx: Stackbox.Context;
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
