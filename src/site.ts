import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type SiteSettings<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  readonly __kind: "site";
  readonly config: T;
};

export class SiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteError";
  }
}

export function createSite<T extends Record<string, unknown>>(
  config: T,
): SiteSettings<T> {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new SiteError("createSite(config): config must be a non-null object");
  }
  if (Object.keys(config).length === 0) {
    throw new SiteError("createSite(config): config must not be empty");
  }

  return {
    __kind: "site" as const,
    config,
  };
}

export function isSite(value: unknown): value is SiteSettings {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as SiteSettings).__kind === "site" &&
    typeof (value as SiteSettings).config === "object" &&
    (value as SiteSettings).config !== null &&
    !Array.isArray((value as SiteSettings).config)
  );
}

export async function loadSite(siteRoot: string): Promise<SiteSettings> {
  const sitePath = resolve(siteRoot, "site.ts");
  const url = pathToFileURL(sitePath).href;
  const imported = await import(url);
  const site = imported.default;

  if (!isSite(site)) {
    throw new SiteError(
      "site.ts must default-export a site from createSite()",
    );
  }

  return site;
}
