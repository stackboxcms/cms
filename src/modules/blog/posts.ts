import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { marked } from "marked";
import type { RenderContext } from "../../pages.js";

export type BlogPost = {
  slug: string;
  title: string;
  description?: string;
  path: string;
  bodyHtml: string;
};

export type BlogDiscoverOptions = {
  contentPath: string;
  pathPrefix: string;
};

function parseFrontmatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  if (!raw.startsWith("---")) {
    return { meta: {}, body: raw };
  }

  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    return { meta: {}, body: raw };
  }

  const frontmatter = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, "");
  const meta: Record<string, string> = {};

  for (const line of frontmatter.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
    if (key) meta[key] = value;
  }

  return { meta, body };
}

export function discoverPosts(
  options: BlogDiscoverOptions,
  ctx: RenderContext,
): BlogPost[] {
  const absoluteDir = resolve(ctx.siteRoot, options.contentPath);
  const files = readdirSync(absoluteDir)
    .filter((name) => extname(name) === ".md")
    .sort();

  return files.map((filename) => {
    const raw = readFileSync(join(absoluteDir, filename), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug ?? basename(filename, ".md");
    const title = meta.title ?? slug;

    return {
      slug,
      title,
      description: meta.description,
      path: `${options.pathPrefix}/${slug}`,
      bodyHtml: marked.parse(body) as string,
    };
  });
}
