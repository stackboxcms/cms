import type { z } from "zod";
import { z as zod } from "zod";
import { isModule, type Module } from "./modules.js";
import type { SlotDefinition, SlotNamesFrom } from "./templates.js";

export type DefaultSlotContent = Module | string;

/** Accepts any module or HTML string (default slot content). */
export const anySlotContentSchema: z.ZodType<DefaultSlotContent> = zod.union([
  zod.string(),
  zod.custom<Module>((value) => isModule(value)),
]);

/** Accepts only HTML strings. */
export const stringSlotContentSchema = zod.string();

/** Accepts only CMS modules. */
export const moduleSlotContentSchema: z.ZodType<Module> = zod.custom<Module>(
  (value) => isModule(value),
);

export type SlotContentFromDefinition<D extends SlotDefinition> =
  D extends { options: { schema: infer Schema extends z.ZodTypeAny } }
    ? z.input<Schema>
    : DefaultSlotContent;

export type PageSlotsInput<
  S extends readonly SlotDefinition[],
  Required extends string,
> = {
  [K in Required]: SlotContentFromDefinition<
    Extract<S[number], { name: K }>
  >[];
} & Partial<{
  [K in Exclude<SlotNamesFrom<S>, Required>]: SlotContentFromDefinition<
    Extract<S[number], { name: K }>
  >[];
}>;

export function validateSlotContentItem(
  slotName: string,
  item: unknown,
  schema: z.ZodTypeAny | undefined,
): void {
  if (schema) {
    const result = schema.safeParse(item);
    if (!result.success) {
      throw new SlotContentValidationError(
        slotName,
        result.error.message,
      );
    }
    return;
  }

  if (typeof item !== "string" && !isModule(item)) {
    throw new SlotContentValidationError(
      slotName,
      "expected module or HTML string",
    );
  }
}

export class SlotContentValidationError extends Error {
  constructor(slotName: string, message: string) {
    super(`slot "${slotName}" content failed validation: ${message}`);
    this.name = "SlotContentValidationError";
  }
}

export function slotHasContent(items: unknown[]): boolean {
  return items.some(
    (item) =>
      isModule(item) ||
      (typeof item === "string" && item.trim().length > 0),
  );
}
