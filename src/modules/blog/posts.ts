import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { marked } from "marked";

export type BlogPost = {
  slug: string;
  title: string;
  description?: string;
  path: string;
  bodyHtml: string;
};

export type BlogOptions = {
  contentPath: string;
  pathPrefix: string;
  /** Max posts per listing page. Omit to put all posts on one page. */
  postsPerPage?: number;
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

export function loadPosts(options: BlogOptions): BlogPost[] {
  const absoluteDir = resolve(options.contentPath);
  const files = readdirSync(absoluteDir)
    .filter((name) => extname(name) === ".md")
    .sort();

  return files.map((filename) => {
    const raw = readFileSync(join(absoluteDir, filename), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug ?? basename(filename, ".md");
    const title = meta.title ?? slug;
    const prefix = options.pathPrefix.replace(/\/+$/, "");

    return {
      slug,
      title,
      description: meta.description,
      path: `${prefix}/${slug}`,
      bodyHtml: marked.parse(body) as string,
    };
  });
}
