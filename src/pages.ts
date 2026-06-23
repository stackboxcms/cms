import type { SiteConfig } from "./site.js";
import type { Stackbox } from "./stackbox/context.js";
import {
  isTemplate,
  type SlotDefinition,
  type SlotNamesFrom,
  type RequiredSlotNamesFrom,
  type TemplateDescriptor,
} from "./templates.js";
import {
  type DefaultSlotContent,
  type PageSlotsInput,
  slotHasContent,
  SlotContentValidationError,
  validateSlotContentItem,
} from "./slot-content.js";

export type PageMeta = {
  description?: string;
  robots?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
};

export type RenderContext = {
  siteConfig: SiteConfig;
  ctx?: Stackbox.Context;
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
  slots: PageSlotsInput<Definitions, RequiredSlots>;
};

/** Widened page type for site builds mixing templates and required slots. */
export type SitePage = {
  readonly __kind: "page";
  path: string;
  template: TemplateDescriptor<string, string>;
  title: string;
  meta?: PageMeta;
  slots: Partial<Record<string, DefaultSlotContent[]>>;
};

/** Page fields passed to template render (slot content lives on `slots`). */
export type PageRenderView = Omit<Page, "template" | "slots">;

export function toPageRenderView({
  template: _template,
  slots: _slots,
  ...view
}: SitePage): PageRenderView {
  return view;
}

export function isPage(value: unknown): value is Page {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Page).__kind === "page" &&
    typeof (value as Page).path === "string" &&
    (value as Page).path.length > 0 &&
    isTemplate((value as Page).template) &&
    typeof (value as Page).title === "string" &&
    (value as Page).title.length > 0 &&
    typeof (value as Page).slots === "object" &&
    (value as Page).slots !== null
  );
}

export class PageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageValidationError";
  }
}

function validatePagePath(path: string): void {
  if (!path || !path.startsWith("/")) {
    throw new PageValidationError('path must start with "/"');
  }
  if (path.includes("..")) {
    throw new PageValidationError("path must not contain '..'");
  }
  const lastSegment = path.split("/").pop() ?? "";
  if (lastSegment.includes(".")) {
    throw new PageValidationError("path must not include a file extension");
  }
}

function validatePageSlotContent(
  template: TemplateDescriptor<string, string>,
  slots: Partial<Record<string, DefaultSlotContent[]>>,
): void {
  const templateSlotNames = new Set(Object.keys(template.slots));

  for (const key of Object.keys(slots)) {
    if (!templateSlotNames.has(key)) {
      throw new PageValidationError(`unknown slot "${key}" for this template`);
    }

    const items = slots[key];
    if (!Array.isArray(items)) {
      throw new PageValidationError(
        `slot "${key}" must be an array of content items`,
      );
    }

    const schema = template.slots[key]?.schema;
    for (const item of items) {
      try {
        validateSlotContentItem(key, item, schema);
      } catch (err) {
        if (err instanceof SlotContentValidationError) {
          throw new PageValidationError(err.message);
        }
        throw err;
      }
    }
  }
}

export function createPage(
  template: TemplateDescriptor<string, string>,
  def: {
    path: string;
    title: string;
    meta?: PageMeta;
    slots: Partial<Record<string, DefaultSlotContent[]>>;
  },
): SitePage;
export function createPage<const S extends readonly SlotDefinition[]>(
  template: TemplateDescriptor<
    SlotNamesFrom<S>,
    RequiredSlotNamesFrom<S>,
    S
  >,
  def: {
    path: string;
    title: string;
    meta?: PageMeta;
    slots: PageSlotsInput<S, RequiredSlotNamesFrom<S>>;
  },
): Page<SlotNamesFrom<S>, RequiredSlotNamesFrom<S>, S>;
export function createPage(
  template: TemplateDescriptor<string, string>,
  def: {
    path: string;
    title: string;
    meta?: PageMeta;
    slots: Partial<Record<string, DefaultSlotContent[]>>;
  },
): SitePage {
  if (!isTemplate(template)) {
    throw new PageValidationError(
      "template must be created with createTemplate()",
    );
  }

  validatePagePath(def.path);

  if (!def.title || def.title.trim().length === 0) {
    throw new PageValidationError("title is required");
  }

  validatePageSlotContent(template, def.slots);

  for (const required of template.requiredSlots) {
    const items = def.slots[required as keyof typeof def.slots];
    if (!items || items.length === 0 || !slotHasContent(items)) {
      throw new PageValidationError(
        `required slot "${required}" must have at least one module or non-empty HTML string`,
      );
    }
  }

  return {
    __kind: "page" as const,
    path: def.path,
    template,
    title: def.title,
    meta: def.meta,
    slots: def.slots,
  };
}

export { validateSlotContentItem } from "./slot-content.js";
