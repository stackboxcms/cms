import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { register } from "node:module";
import {
  copyRegisteredPluginAssets,
  runRegisteredPluginBuilds,
} from "./plugin.js";
import { isSite } from "./site.js";
import type { Stackbox as SB } from "./types.js";

const DEFAULT_SITE_ENTRIES = [
  "server.ts",
  "server.js",
  "src/server.ts",
  "src/server.js",
] as const;

export class BuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildError";
  }
}

function requireDirOption(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BuildError(`build(): ${label} must be a non-empty string`);
  }
  return resolve(value.trim());
}

export function resolveBuildSettings(
  options: Omit<SB.BuildOptions, "site">,
): SB.BuildSettings {
  const outDir = requireDirOption(options.outDir ?? "dist", "outDir");
  const publicDir = requireDirOption(
    options.publicDir ?? join(outDir, "public"),
    "publicDir",
  );
  return { outDir, publicDir };
}

/**
 * Run the site build. Copies each registered plugin's `public_assets/` to
 * `{publicDir}/_sb/plugins/{name}/`, then runs plugin `build` hooks.
 */
export async function build(options: SB.BuildOptions): Promise<SB.BuildResult> {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new BuildError("build(): site is required");
  }
  if (!isSite(options.site)) {
    throw new BuildError("build(): site must be from createSite()");
  }

  const settings = resolveBuildSettings(options);
  mkdirSync(settings.outDir, { recursive: true });
  mkdirSync(settings.publicDir, { recursive: true });
  copyRegisteredPluginAssets(options.site.plugins, settings.publicDir);
  await runRegisteredPluginBuilds(options.site.plugins, {
    site: options.site,
    outDir: settings.outDir,
    publicDir: settings.publicDir,
  });

  return { settings, plugins: options.site.plugins };
}

function readFlag(
  args: string[],
  index: number,
  name: string,
): { value: string; next: number } {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new BuildError(`stackbox-cms build: ${name} requires a value`);
  }
  return { value, next: index + 2 };
}

export function parseBuildCliArgs(argv: string[]): SB.BuildCliArgs {
  const args = argv.slice(2);
  let index = 0;

  if (args[0] && !args[0].startsWith("-")) {
    if (args[0] !== "build") {
      throw new BuildError(
        `stackbox-cms: unknown command "${args[0]}" (expected "build")`,
      );
    }
    index = 1;
  }

  let site: string | undefined;
  let outDir: string | undefined;
  let publicDir: string | undefined;

  while (index < args.length) {
    const arg = args[index]!;
    if (arg === "--site") {
      ({ value: site, next: index } = readFlag(args, index, "--site"));
      continue;
    }
    if (arg === "--outDir") {
      ({ value: outDir, next: index } = readFlag(args, index, "--outDir"));
      continue;
    }
    if (arg === "--publicDir") {
      ({ value: publicDir, next: index } = readFlag(args, index, "--publicDir"));
      continue;
    }
    throw new BuildError(`stackbox-cms build: unknown option "${arg}"`);
  }

  return { command: "build", site, outDir, publicDir };
}

function defaultSiteEntry(cwd: string): string {
  for (const candidate of DEFAULT_SITE_ENTRIES) {
    const absolute = resolve(cwd, candidate);
    if (existsSync(absolute)) {
      return absolute;
    }
  }
  throw new BuildError(
    `stackbox-cms build: no site entry found (looked for ${DEFAULT_SITE_ENTRIES.join(", ")}). Pass --site`,
  );
}

let tsxRegistered = false;

function tsxAlreadyActive(): boolean {
  const flags = [...process.execArgv, process.env.NODE_OPTIONS ?? ""].join(" ");
  return flags.includes("tsx");
}

function ensureTsxRegistered(): void {
  if (tsxRegistered || tsxAlreadyActive()) {
    tsxRegistered = true;
    return;
  }
  try {
    register("tsx", import.meta.url);
  } catch {
    // Loader already registered in this process.
  }
  tsxRegistered = true;
}

export async function loadSiteFromEntry(
  entry: string,
  cwd = process.cwd(),
): Promise<SB.Site> {
  const absolute = resolve(cwd, entry);
  if (!existsSync(absolute)) {
    throw new BuildError(`stackbox-cms build: site entry not found: ${absolute}`);
  }

  ensureTsxRegistered();
  const mod = (await import(pathToFileURL(absolute).href)) as Record<
    string,
    unknown
  >;
  const candidate = isSite(mod.default)
    ? mod.default
    : isSite(mod.site)
      ? mod.site
      : null;

  if (!candidate) {
    throw new BuildError(
      `stackbox-cms build: ${absolute} must default-export a site from createSite()`,
    );
  }
  return candidate;
}

export async function runBuildCli(
  argv: string[],
  cwd = process.cwd(),
): Promise<SB.BuildResult> {
  const args = parseBuildCliArgs(argv);
  const entry = args.site
    ? resolve(cwd, args.site)
    : defaultSiteEntry(cwd);
  const site = await loadSiteFromEntry(entry, cwd);
  return build({
    site,
    outDir: args.outDir ? resolve(cwd, args.outDir) : resolve(cwd, "dist"),
    publicDir: args.publicDir ? resolve(cwd, args.publicDir) : undefined,
  });
}
