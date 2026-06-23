import { render, type HSHtml } from "@hyperspan/html";
import type { z } from "zod";
import { isSite, type SiteSettings } from "./site.js";
import type { PageRenderView } from "./pages.js";
import {
  buildStubSlots,
  slotSentinel,
  type TemplateSlotsFrom,
} from "./slot-handle.js";

export type SlotOptions = {
  required?: boolean;
  primary?: true;
  schema?: z.ZodTypeAny;
};

export type SlotDefinition = {
  name: string;
  options?: SlotOptions;
};

export type SlotMeta = {
  isDefault: boolean;
  required: boolean;
  schema?: z.ZodTypeAny;
};

export type TemplateRenderContext<
  S extends readonly SlotDefinition[] = readonly SlotDefinition[],
> = {
  head?: HSHtml;
  site: SiteSettings;
  page: PageRenderView;
  slots: TemplateSlotsFrom<S>;
};

/** Widened render signature stored on descriptors at runtime. */
export type TemplateRenderFn = (ctx: {
  head?: HSHtml;
  site: SiteSettings;
  page: PageRenderView;
  slots: Record<string, import("./slot-handle.js").Slot>;
}) => HSHtml;

export type TemplateDescriptor<
  Slots extends string = string,
  RequiredSlots extends Slots = never,
  Definitions extends readonly SlotDefinition[] = readonly SlotDefinition[],
> = {
  readonly __kind: "template";
  site: SiteSettings;
  formatPageTitle: (title: string) => string;
  render: TemplateRenderFn;
  slots: Record<Slots, SlotMeta>;
  requiredSlots: readonly RequiredSlots[];
  readonly __definitions?: Definitions;
};

export type SlotNamesFrom<S extends readonly SlotDefinition[]> =
  S[number]["name"];

export type RequiredSlotNamesFrom<S extends readonly SlotDefinition[]> =
  Extract<
    S[number],
    { options: { required: true } } | { options: { primary: true } }
  >["name"];

export function isTemplate(value: unknown): value is TemplateDescriptor {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as TemplateDescriptor).__kind === "template" &&
    isSite((value as TemplateDescriptor).site) &&
    typeof (value as TemplateDescriptor).formatPageTitle === "function" &&
    typeof (value as TemplateDescriptor).render === "function" &&
    typeof (value as TemplateDescriptor).slots === "object" &&
    (value as TemplateDescriptor).slots !== null &&
    Array.isArray((value as TemplateDescriptor).requiredSlots)
  );
}

function defaultFormatPageTitle(
  pageTitle: string,
  site: SiteSettings,
): string {
  const suffix = site.config.titleSuffix;
  return typeof suffix === "string" ? pageTitle + suffix : pageTitle;
}

type SlotRegistryEntry = {
  name: string;
  isDefault: boolean;
  required: boolean;
  schema?: z.ZodTypeAny;
};

export class TemplateBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateBuildError";
  }
}

function validateSlotDefinitions(
  definitions: readonly SlotDefinition[],
): SlotRegistryEntry[] {
  if (definitions.length === 0) {
    throw new TemplateBuildError("template must define at least one slot");
  }

  const entries: SlotRegistryEntry[] = [];
  const seen = new Set<string>();
  let primaryCount = 0;

  for (const def of definitions) {
    if (!def.name || def.name.length === 0) {
      throw new TemplateBuildError("slot name must be non-empty");
    }
    if (seen.has(def.name)) {
      throw new TemplateBuildError(`duplicate slot name "${def.name}"`);
    }
    seen.add(def.name);

    const opts = def.options ?? {};
    const isDefault = opts.primary === true;
    if (isDefault) {
      primaryCount++;
    }

    entries.push({
      name: def.name,
      isDefault,
      required: opts.required === true || opts.primary === true,
      schema: opts.schema,
    });
  }

  if (primaryCount !== 1) {
    throw new TemplateBuildError(
      `exactly one slot must have options.primary: true; found ${primaryCount}`,
    );
  }

  return entries;
}

function validateRenderOutput(
  html: string,
  slotNames: readonly string[],
): void {
  for (const name of slotNames) {
    if (!html.includes(slotSentinel(name))) {
      throw new TemplateBuildError(
        `slot "${name}" must be rendered via slots.${name}.render()`,
      );
    }
  }
}

const stubPage: PageRenderView = {
  __kind: "page",
  path: "/",
  title: "Template validation",
};

export function createTemplate<const S extends readonly SlotDefinition[]>(
  def: {
    site: SiteSettings;
    slots: S;
    title?: (pageTitle: string, site: SiteSettings) => string;
    render: (ctx: TemplateRenderContext<S>) => HSHtml;
  },
): TemplateDescriptor<
  SlotNamesFrom<S>,
  RequiredSlotNamesFrom<S>,
  S
> {
  if (!isSite(def.site)) {
    throw new TemplateBuildError(
      "createTemplate({ site }): site must be created with createSite()",
    );
  }

  const formatPageTitle = def.title
    ? (pageTitle: string) => def.title!(pageTitle, def.site)
    : (pageTitle: string) => defaultFormatPageTitle(pageTitle, def.site);

  const entries = validateSlotDefinitions(def.slots);
  const stubSlots = buildStubSlots(def.slots);

  const validationHtml = render(
    def.render({
      site: def.site,
      page: stubPage,
      slots: stubSlots,
    }),
  );

  validateRenderOutput(
    validationHtml,
    entries.map((entry) => entry.name),
  );

  const slots = {} as Record<SlotNamesFrom<S>, SlotMeta>;
  const requiredSlots: RequiredSlotNamesFrom<S>[] = [];

  for (const entry of entries) {
    slots[entry.name as SlotNamesFrom<S>] = {
      isDefault: entry.isDefault,
      required: entry.required,
      schema: entry.schema,
    };
    if (entry.required) {
      requiredSlots.push(entry.name as RequiredSlotNamesFrom<S>);
    }
  }

  return {
    __kind: "template" as const,
    site: def.site,
    formatPageTitle,
    render: def.render as TemplateRenderFn,
    slots,
    requiredSlots,
    __definitions: def.slots,
  };
}

export type { Slot, TemplateSlotsFrom } from "./slot-handle.js";
