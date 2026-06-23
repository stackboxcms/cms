import { html, type HSHtml } from "@hyperspan/html";
import type { z } from "zod";
import { isModule } from "./modules.js";
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

export function renderSlotContent(
  slotName: string,
  items: readonly unknown[],
  ctx: RenderContext,
  schema: z.ZodTypeAny | undefined,
): Promise<HSHtml> {
  return Promise.all(
    items.map(async (item) => {
      try {
        validateSlotContentItem(slotName, item, schema);
      } catch (err) {
        throw new RenderError(
          err instanceof Error ? err.message : String(err),
        );
      }

      if (typeof item === "string") {
        return html.raw(item);
      }
      if (isModule(item)) {
        return item.render(ctx);
      }
      throw new RenderError(
        "invalid slot content; expected module or HTML string",
      );
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
