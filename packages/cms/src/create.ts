import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_TEMPLATE_ID = "blank";
const DEFAULT_THEME_ID = "minimal";

const SKIPPED_NAMES = new Set([
  "node_modules",
  ".wrangler",
  "dist",
  "package-lock.json",
  "themes.json",
]);

export class CreateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateError";
  }
}

export type ThemeInfo = {
  id: string;
  name: string;
  description: string;
};

export type CreateSiteOptions = {
  directory: string;
  theme?: string;
};

export type CreateSiteResult = {
  directory: string;
  theme: string;
  siteId: string;
};

type TemplateFiles = Record<string, string>;

export function templatesRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "themes");
}

export function listThemes(root = templatesRoot()): ThemeInfo[] {
  const catalogPath = join(root, "themes.json");
  const catalog = existsSync(catalogPath)
    ? (JSON.parse(readFileSync(catalogPath, "utf8")) as ThemeInfo[])
    : [];
  const known = new Map(catalog.map((theme) => [theme.id, theme]));
  const ids = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => {
      const aIndex = catalog.findIndex((theme) => theme.id === a);
      const bIndex = catalog.findIndex((theme) => theme.id === b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

  return ids.map(
    (id) =>
      known.get(id) ?? {
        id,
        name: id,
        description: "",
      },
  );
}

function listFiles(root: string, relative = ""): string[] {
  const entries = readdirSync(join(root, relative), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const child = relative === "" ? entry.name : `${relative}/${entry.name}`;
    if (SKIPPED_NAMES.has(entry.name) || SKIPPED_NAMES.has(child)) {
      return [];
    }
    return entry.isDirectory() ? listFiles(root, child) : [child];
  });
}

function readTemplateDir(dir: string): TemplateFiles {
  return Object.fromEntries(
    listFiles(dir).map((file) => [file, readFileSync(join(dir, file), "utf8")]),
  );
}

export function siteIdFromDirectory(directory: string): string {
  const slug = basename(directory)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new CreateError(
      "stackbox-cms create: directory name must include a letter or number",
    );
  }
  return slug;
}

function loadThemeFiles(root: string, themeId: string): TemplateFiles {
  const themeDir = join(root, themeId);
  if (!existsSync(themeDir)) {
    const available = listThemes(root)
      .map((theme) => theme.id)
      .join(", ");
    throw new CreateError(
      `stackbox-cms create: unknown theme "${themeId}" (available: ${available})`,
    );
  }

  const base = readTemplateDir(join(root, BASE_TEMPLATE_ID));
  const overlay = themeId === BASE_TEMPLATE_ID ? {} : readTemplateDir(themeDir);
  return { ...base, ...overlay };
}

function assertEmptyDirectory(directory: string): void {
  if (!existsSync(directory)) {
    return;
  }
  const entries = readdirSync(directory);
  if (entries.length > 0) {
    throw new CreateError(
      `stackbox-cms create: ${directory} already exists and is not empty`,
    );
  }
}

export function createSite(options: CreateSiteOptions, root = templatesRoot()): CreateSiteResult {
  const directory = resolve(options.directory);
  const theme = options.theme ?? DEFAULT_THEME_ID;
  const siteId = siteIdFromDirectory(directory);
  const files = loadThemeFiles(root, theme);
  const config = files["src/site.config.ts"];
  if (config !== undefined) {
    files["src/site.config.ts"] = config.replaceAll("{{SITE_ID}}", siteId);
  }

  assertEmptyDirectory(directory);

  for (const [file, content] of Object.entries(files)) {
    const target = join(directory, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }

  return { directory, theme, siteId };
}

function readFlag(
  args: string[],
  index: number,
  name: string,
): { value: string; next: number } {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new CreateError(`stackbox-cms create: ${name} requires a value`);
  }
  return { value, next: index + 2 };
}

export function parseCreateCliArgs(argv: string[]): {
  directory?: string;
  theme?: string;
  list: boolean;
} {
  const args = argv.slice(2);
  if (args[0] !== "create") {
    throw new CreateError(
      `stackbox-cms: unknown command "${args[0] ?? ""}" (expected "create")`,
    );
  }

  let directory: string | undefined;
  let theme: string | undefined;
  let list = false;

  for (let index = 1; index < args.length; ) {
    const arg = args[index]!;
    if (arg === "--theme") {
      ({ value: theme, next: index } = readFlag(args, index, "--theme"));
      continue;
    }
    if (arg === "--list") {
      list = true;
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new CreateError(`stackbox-cms create: unknown option "${arg}"`);
    }
    if (directory) {
      throw new CreateError(
        `stackbox-cms create: unexpected argument "${arg}"`,
      );
    }
    directory = arg;
    index += 1;
  }

  return { directory, theme, list };
}

export function formatThemeList(themes: readonly ThemeInfo[]): string {
  const width = Math.max(...themes.map((theme) => theme.id.length));
  return themes
    .map((theme) => {
      const description = theme.description ? `  ${theme.description}` : "";
      const marker = theme.id === DEFAULT_THEME_ID ? " (default)" : "";
      return `  ${theme.id.padEnd(width)}  ${theme.name}${marker}${description}`;
    })
    .join("\n");
}

export function runCreateCli(argv: string[], cwd = process.cwd()): CreateSiteResult | undefined {
  const args = parseCreateCliArgs(argv);
  if (args.list) {
    console.log("Themes:\n");
    console.log(formatThemeList(listThemes()));
    console.log("\nCreate a site:\n  stackbox-cms create <directory> [--theme <id>]");
    return undefined;
  }
  if (!args.directory) {
    throw new CreateError(
      "stackbox-cms create: a directory is required\n  stackbox-cms create <directory> [--theme <id>]\n  stackbox-cms create --list",
    );
  }

  const directory = resolve(cwd, args.directory);
  const result = createSite({ directory, theme: args.theme });
  console.log(`Created ${basename(result.directory)} from the ${result.theme} theme`);
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${args.directory}`);
  console.log("  npm install");
  console.log("  npm start");
  return result;
}
