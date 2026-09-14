import { html, renderAsync, type HSHtml } from "@hyperspan/html";
import type { z } from "zod";
import { isBlock, type Block } from "./blocks.js";
import type { SitePage, RenderContext } from "./pages.js";
import {
  type DefaultSlotContent,
  type SlotContentFromDefinition,
  validateSlotContentItem,
} from "./slot-content.js";
import type { SlotDefinition, SlotNamesFrom } from "./templates.js";

export class RenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderError";
  }
}

export const SLOT_SENTINEL_PREFIX = "<!--__STACKBOX_SLOT__:";

export function slotSentinel(name: string): string {
  return `${SLOT_SENTINEL_PREFIX}${name}-->`;
}

type HtmlSafe = ReturnType<typeof html.raw>;
export type { HSHtml } from "@hyperspan/html";
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

async function renderSlotItemHtml(
  slotName: string,
  item: unknown,
  ctx: RenderContext,
  schema: z.ZodTypeAny | undefined,
): Promise<string> {
  try {
    validateSlotContentItem(slotName, item, schema);
  } catch (err) {
    throw new RenderError(err instanceof Error ? err.message : String(err));
  }

  if (typeof item === "string") {
    return item;
  }
  if (isBlock(item)) {
    const rendered = await item.render(ctx);
    return renderAsync(rendered);
  }
  throw new RenderError(
    "invalid slot content; expected block or HTML string",
  );
}

export function renderSlotContent(
  slotName: string,
  items: readonly unknown[],
  ctx: RenderContext,
  schema: z.ZodTypeAny | undefined,
): Promise<HSHtml> {
  return Promise.all(
    items.map(async (item, index) => {
      let htmlString = await renderSlotItemHtml(slotName, item, ctx, schema);

      const hook = ctx.hooks?.renderSlotItem;
      if (hook && ctx.page) {
        htmlString = await hook(htmlString, {
          item: item as Block | string,
          slot: slotName,
          index,
          page: ctx.page,
          ctx: ctx.ctx,
        });
      }

      return html.raw(htmlString);
    }),
  ).then((chunks) => html`${chunks}`);
}

export function createStubSlot<
  D extends SlotDefinition,
>(definition: D): Slot<DefaultSlotContent, D> {
  return {
    name: definition.name,
    definition,
    content: [],
    render() {
      return html.raw(slotSentinel(definition.name));
    },
  };
}

export function createPageSlot<
  D extends SlotDefinition,
>(
  definition: D,
  content: readonly SlotContentFromDefinition<D>[],
  ctx: RenderContext,
): Slot<SlotContentFromDefinition<D>, D> {
  const schema = definition.options?.schema;
  return {
    name: definition.name,
    definition,
    content,
    render() {
      return renderSlotContent(definition.name, content, ctx, schema);
    },
  };
}

export function buildStubSlots<S extends readonly SlotDefinition[]>(
  definitions: S,
): TemplateSlotsFrom<S> {
  const slots = {} as TemplateSlotsFrom<S>;
  for (const def of definitions) {
    slots[def.name as SlotNamesFrom<S>] = createStubSlot(
      def,
    ) as TemplateSlotsFrom<S>[SlotNamesFrom<S>];
  }
  return slots;
}

export function buildPageSlots(
  page: SitePage,
  ctx: RenderContext,
): Record<string, Slot> {
  const slots: Record<string, Slot> = {};
  const definitions = page.template.__definitions ?? [];

  for (const def of definitions) {
    const content = page.slots[def.name] ?? [];
    slots[def.name] = createPageSlot(def, content, ctx);
  }

  return slots;
}
