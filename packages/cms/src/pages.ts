import type { Stackbox as SB } from "./types.js";
import {
  isTemplate,
} from "./templates.js";
import {
  slotHasContent,
  SlotContentValidationError,
  validateSlotContentItem,
} from "./slot-content.js";

export function toPageRenderView({
  template: _template,
  slots: _slots,
  ...view
}: SB.SitePage): SB.PageRenderView {
  return view;
}

export function isPage(value: unknown): value is SB.Page {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as SB.Page).__kind === "page" &&
    typeof (value as SB.Page).path === "string" &&
    (value as SB.Page).path.length > 0 &&
    isTemplate((value as SB.Page).template) &&
    typeof (value as SB.Page).title === "string" &&
    (value as SB.Page).title.length > 0 &&
    typeof (value as SB.Page).slots === "object" &&
    (value as SB.Page).slots !== null
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
  template: SB.TemplateDescriptor<string, string>,
  slots: Partial<Record<string, SB.DefaultSlotContent[]>>,
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
  template: SB.TemplateDescriptor<string, string>,
  def: {
    path: string;
    title: string;
    meta?: SB.PageMeta;
    cache?: SB.CacheConfig;
    source?: string;
    slots: Partial<Record<string, SB.DefaultSlotContent[]>>;
  },
): SB.SitePage;
export function createPage<const S extends readonly SB.SlotDefinition[]>(
  template: SB.TemplateDescriptor<
    SB.SlotNamesFrom<S>,
    SB.RequiredSlotNamesFrom<S>,
    S
  >,
  def: {
    path: string;
    title: string;
    meta?: SB.PageMeta;
    cache?: SB.CacheConfig;
    source?: string;
    slots: SB.PageSlotsInput<S, SB.RequiredSlotNamesFrom<S>>;
  },
): SB.Page<SB.SlotNamesFrom<S>, SB.RequiredSlotNamesFrom<S>, S>;
export function createPage(
  template: SB.TemplateDescriptor<string, string>,
  def: {
    path: string;
    title: string;
    meta?: SB.PageMeta;
    cache?: SB.CacheConfig;
    source?: string;
    slots: Partial<Record<string, SB.DefaultSlotContent[]>>;
  },
): SB.SitePage {
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
        `required slot "${required}" must have at least one block or non-empty HTML string`,
      );
    }
  }

  return {
    __kind: "page" as const,
    path: def.path,
    template,
    title: def.title,
    meta: def.meta,
    cache: def.cache,
    source: def.source,
    slots: def.slots,
  };
}

export { validateSlotContentItem } from "./slot-content.js";
