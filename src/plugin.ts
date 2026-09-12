import { cpSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { Stackbox } from "./stackbox/context.js";
import type { Site } from "./site.js";

export type PluginRoute = {
  path: string;
  fetch: (
    request: globalThis.Request,
    ctx: Stackbox.Context,
  ) => globalThis.Response | Promise<globalThis.Response>;
};

export type PluginRouteContext = {
  site: Site;
};

export type PluginBuildContext = {
  site: Site;
  outDir: string;
  publicDir: string;
};

export type Plugin = {
  readonly __kind: "plugin";
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly keywords: readonly string[];
  /** Directory of the plugin entry (`import.meta.dirname`). */
  readonly root: string;
  /** Private files imported by the plugin (`assets/`). */
  readonly assetsDir: string;
  /** Files served over HTTP (`public_assets/`). */
  readonly publicAssetsDir: string;
  routes?: (
    ctx: PluginRouteContext,
  ) => readonly PluginRoute[] | Promise<readonly PluginRoute[]>;
  build?: (ctx: PluginBuildContext) => void | Promise<void>;
};

export type CreatePluginOptions = {
  name: string;
  description: string;
  version: string;
  keywords: readonly string[];
  /**
   * Directory that contains `assets/` and `public_assets/`.
   * Pass `import.meta.dirname` when those folders sit next to the plugin entry.
   * Third-party packages may pass their package root instead.
   */
  root: string;
  routes?: (
    ctx: PluginRouteContext,
  ) => readonly PluginRoute[] | Promise<readonly PluginRoute[]>;
  build?: (ctx: PluginBuildContext) => void | Promise<void>;
};

export class PluginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginError";
  }
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PluginError(`createPlugin(): ${label} is required`);
  }
  return value.trim();
}

function assertSafePluginName(name: string): void {
  if (
    name === "." ||
    name === ".." ||
    name.includes("/") ||
    name.includes("\\")
  ) {
    throw new PluginError(
      `createPlugin(): name must be a single path segment (got "${name}")`,
    );
  }
}

function requireKeywords(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PluginError(
      "createPlugin(): keywords must be a non-empty array of strings",
    );
  }

  const keywords = value.map((keyword, index) => {
    if (typeof keyword !== "string" || keyword.trim().length === 0) {
      throw new PluginError(
        `createPlugin(): keywords[${index}] must be a non-empty string`,
      );
    }
    return keyword.trim();
  });

  return Object.freeze(keywords);
}

function requireRootDir(root: unknown): string {
  return resolve(requireNonEmptyString(root, "root"));
}

/**
 * When a plugin is compiled to `dist/plugins/<folder>`, `assets/` and
 * `public_assets/` may still live next to the TypeScript source.
 * Uses the on-disk folder name, which can differ from `plugin.name`.
 */
function sourcePluginSubdir(root: string, folder: string): string | null {
  const needle = `${sep}dist${sep}plugins${sep}`;
  const index = root.lastIndexOf(needle);
  if (index === -1) {
    return null;
  }
  const dirName = root.slice(index + needle.length).split(sep)[0];
  if (!dirName) {
    return null;
  }
  const candidate = join(
    root.slice(0, index),
    "src",
    "plugins",
    dirName,
    folder,
  );
  return existsSync(candidate) ? candidate : null;
}

function resolvePluginSubdir(root: string, folder: string): string {
  const local = join(root, folder);
  if (existsSync(local)) {
    return local;
  }
  return sourcePluginSubdir(root, folder) ?? local;
}

export function createPlugin(options: CreatePluginOptions): Plugin {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new PluginError(
      "createPlugin(): name, description, version, keywords, and root are required",
    );
  }

  const name = requireNonEmptyString(options.name, "name");
  assertSafePluginName(name);

  const description = requireNonEmptyString(options.description, "description");
  const version = requireNonEmptyString(options.version, "version");
  const keywords = requireKeywords(options.keywords);
  const root = requireRootDir(options.root);

  return {
    __kind: "plugin" as const,
    name,
    description,
    version,
    keywords,
    root,
    assetsDir: resolvePluginSubdir(root, "assets"),
    publicAssetsDir: resolvePluginSubdir(root, "public_assets"),
    ...(options.routes ? { routes: options.routes } : {}),
    ...(options.build ? { build: options.build } : {}),
  };
}

export function isPlugin(value: unknown): value is Plugin {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Plugin).__kind === "plugin" &&
    typeof (value as Plugin).name === "string" &&
    (value as Plugin).name.length > 0 &&
    typeof (value as Plugin).description === "string" &&
    (value as Plugin).description.length > 0 &&
    typeof (value as Plugin).version === "string" &&
    (value as Plugin).version.length > 0 &&
    Array.isArray((value as Plugin).keywords) &&
    (value as Plugin).keywords.length > 0 &&
    typeof (value as Plugin).root === "string" &&
    typeof (value as Plugin).assetsDir === "string" &&
    typeof (value as Plugin).publicAssetsDir === "string"
  );
}

export function assertPlugin(value: unknown, label = "plugin"): Plugin {
  if (!isPlugin(value)) {
    throw new PluginError(
      `${label}: each plugin must be created with createPlugin() and include name, description, version, and keywords`,
    );
  }
  return value;
}

function copyDirIfPresent(source: string, dest: string): void {
  if (!existsSync(source) || !statSync(source).isDirectory()) {
    return;
  }
  if (resolve(source) === resolve(dest)) {
    return;
  }
  mkdirSync(dest, { recursive: true });
  cpSync(source, dest, { recursive: true });
}

/**
 * Copy each registered plugin's private `assets/` next to its compiled entry
 * (`{plugin.root}/assets`). Used by this package's build — not a site public copy.
 */
export function copyPluginPrivateAssets(plugins: readonly Plugin[]): void {
  for (const plugin of plugins) {
    assertPlugin(plugin, "copyPluginPrivateAssets()");
    copyDirIfPresent(plugin.assetsDir, join(plugin.root, "assets"));
  }
}

/**
 * Copy each registered plugin's `public_assets/` to
 * `{publicDir}/_sb/plugins/{name}/`. Only plugins you pass in are copied.
 */
export function copyRegisteredPluginAssets(
  plugins: readonly Plugin[],
  publicDir: string,
): void {
  const destRoot = requireNonEmptyString(publicDir, "publicDir");
  const seen = new Set<string>();

  for (const plugin of plugins) {
    assertPlugin(plugin, "copyRegisteredPluginAssets()");
    if (seen.has(plugin.name)) {
      throw new PluginError(
        `copyRegisteredPluginAssets(): duplicate plugin name "${plugin.name}"`,
      );
    }
    seen.add(plugin.name);
    copyDirIfPresent(
      plugin.publicAssetsDir,
      join(destRoot, "_sb", "plugins", plugin.name),
    );
  }
}

/**
 * Run each registered plugin's `build` hook (e.g. write sitemap.xml).
 */
export async function runRegisteredPluginBuilds(
  plugins: readonly Plugin[],
  ctx: PluginBuildContext,
): Promise<void> {
  for (const plugin of plugins) {
    assertPlugin(plugin, "runRegisteredPluginBuilds()");
    if (plugin.build) {
      await plugin.build(ctx);
    }
  }
}
