import { html, renderAsync, type HSHtml } from "@hyperspan/html";
import type { z } from "zod";
import { isBlock } from "./blocks.js";
import type { Stackbox as SB } from "./types.js";
import {
  validateSlotContentItem,
} from "./slot-content.js";

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

async function renderSlotItemHtml(
  slotName: string,
  item: unknown,
  ctx: SB.RenderContext,
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
  ctx: SB.RenderContext,
  schema: z.ZodTypeAny | undefined,
): Promise<HSHtml> {
  return Promise.all(
    items.map(async (item, index) => {
      let htmlString = await renderSlotItemHtml(slotName, item, ctx, schema);

      const hook = ctx.hooks?.renderSlotItem;
      if (hook && ctx.page) {
        htmlString = await hook(htmlString, {
          item: item as SB.Block | string,
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
  D extends SB.SlotDefinition,
>(definition: D): SB.Slot<SB.DefaultSlotContent, D> {
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
  D extends SB.SlotDefinition,
>(
  definition: D,
  content: readonly SB.SlotContentFromDefinition<D>[],
  ctx: SB.RenderContext,
): SB.Slot<SB.SlotContentFromDefinition<D>, D> {
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

export function buildStubSlots<S extends readonly SB.SlotDefinition[]>(
  definitions: S,
): SB.TemplateSlotsFrom<S> {
  const slots = {} as SB.TemplateSlotsFrom<S>;
  for (const def of definitions) {
    slots[def.name as SB.SlotNamesFrom<S>] = createStubSlot(
      def,
    ) as SB.TemplateSlotsFrom<S>[SB.SlotNamesFrom<S>];
  }
  return slots;
}

export function buildPageSlots(
  page: SB.SitePage,
  ctx: SB.RenderContext,
): Record<string, SB.Slot> {
  const slots: Record<string, SB.Slot> = {};
  const definitions = page.template.__definitions ?? [];

  for (const def of definitions) {
    const content = page.slots[def.name] ?? [];
    slots[def.name] = createPageSlot(def, content, ctx);
  }

  return slots;
}
