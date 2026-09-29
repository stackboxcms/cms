import { render, type HSHtml } from "@hyperspan/html";
import type { z } from "zod";
import { isSiteConfig } from "./site.js";
import {
  buildStubSlots,
  slotSentinel,
} from "./slot-handle.js";
import type { Stackbox as SB } from "./types.js";

export function isTemplate(value: unknown): value is SB.TemplateDescriptor {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as SB.TemplateDescriptor).__kind === "template" &&
    isSiteConfig((value as SB.TemplateDescriptor).siteConfig) &&
    typeof (value as SB.TemplateDescriptor).formatPageTitle === "function" &&
    typeof (value as SB.TemplateDescriptor).render === "function" &&
    typeof (value as SB.TemplateDescriptor).slots === "object" &&
    (value as SB.TemplateDescriptor).slots !== null &&
    Array.isArray((value as SB.TemplateDescriptor).requiredSlots)
  );
}

function defaultFormatPageTitle(
  pageTitle: string,
  siteConfig: SB.SiteConfig,
): string {
  const suffix = siteConfig.config.titleSuffix;
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
  definitions: readonly SB.SlotDefinition[],
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

const stubPage: SB.PageRenderView = {
  __kind: "page",
  path: "/",
  title: "Template validation",
};

export function createTemplate<const S extends readonly SB.SlotDefinition[]>(
  def: {
    siteConfig: SB.SiteConfig;
    slots: S;
    title?: (pageTitle: string, siteConfig: SB.SiteConfig) => string;
    render: (ctx: SB.TemplateRenderContext<S>) => HSHtml;
  },
): SB.TemplateDescriptor<
  SB.SlotNamesFrom<S>,
  SB.RequiredSlotNamesFrom<S>,
  S
> {
  if (!isSiteConfig(def.siteConfig)) {
    throw new TemplateBuildError(
      "createTemplate({ siteConfig }): siteConfig must be from createSiteConfig()",
    );
  }

  const formatPageTitle = def.title
    ? (pageTitle: string) => def.title!(pageTitle, def.siteConfig)
    : (pageTitle: string) =>
        defaultFormatPageTitle(pageTitle, def.siteConfig);

  const entries = validateSlotDefinitions(def.slots);
  const stubSlots = buildStubSlots(def.slots);

  const validationHtml = render(
    def.render({
      siteConfig: def.siteConfig,
      page: stubPage,
      slots: stubSlots,
    }),
  );

  validateRenderOutput(
    validationHtml,
    entries.map((entry) => entry.name),
  );

  const slots = {} as Record<SB.SlotNamesFrom<S>, SB.SlotMeta>;
  const requiredSlots: SB.RequiredSlotNamesFrom<S>[] = [];

  for (const entry of entries) {
    slots[entry.name as SB.SlotNamesFrom<S>] = {
      isDefault: entry.isDefault,
      required: entry.required,
      schema: entry.schema,
    };
    if (entry.required) {
      requiredSlots.push(entry.name as SB.RequiredSlotNamesFrom<S>);
    }
  }

  return {
    __kind: "template" as const,
    siteConfig: def.siteConfig,
    formatPageTitle,
    render: def.render as SB.TemplateRenderFn,
    slots,
    requiredSlots,
    __definitions: def.slots,
  };
}
