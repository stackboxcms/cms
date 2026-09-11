import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePathname } from "./routing.js";

export const PLUGIN_PUBLIC_PREFIX = "/_sb/plugins";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function assertSafeSegment(segment: string, label: string): void {
  if (
    !segment ||
    segment === "." ||
    segment === ".." ||
    segment.includes("/") ||
    segment.includes("\\")
  ) {
    throw new Error(`pluginAssetPath: invalid ${label}`);
  }
}

export function pluginAssetPath(pluginName: string, relativePath: string): string {
  assertSafeSegment(pluginName, "plugin name");
  const segments = relativePath
    .split(/[/\\]+/)
    .filter((segment) => segment.length > 0);
  for (const segment of segments) {
    assertSafeSegment(segment, "relative path segment");
  }
  return `${PLUGIN_PUBLIC_PREFIX}/${pluginName}/${segments.join("/")}`;
}

export type PluginAssetRequest = {
  plugin: string;
  relativePath: string;
};

export function parsePluginAssetRequest(
  pathname: string,
): PluginAssetRequest | null {
  const normalized = normalizePathname(pathname);
  const prefix = `${PLUGIN_PUBLIC_PREFIX}/`;
  if (!normalized.startsWith(prefix)) {
    return null;
  }

  const rest = normalized.slice(prefix.length);
  const slash = rest.indexOf("/");
  if (slash <= 0 || slash === rest.length - 1) {
    return null;
  }

  const plugin = rest.slice(0, slash);
  const relativePath = rest.slice(slash + 1);
  if (
    !plugin ||
    !relativePath ||
    relativePath.includes("..") ||
    relativePath.includes("\\")
  ) {
    return null;
  }

  try {
    assertSafeSegment(plugin, "plugin name");
    for (const segment of relativePath.split("/")) {
      assertSafeSegment(segment, "relative path segment");
    }
  } catch {
    return null;
  }

  return { plugin, relativePath };
}

export function getPluginPublicRootDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const fromDist = join(here, "public", "_sb", "plugins");
  if (existsSync(fromDist)) {
    return fromDist;
  }

  const fromSrcDev = join(here, "..", "dist", "public", "_sb", "plugins");
  if (existsSync(fromSrcDev)) {
    return fromSrcDev;
  }

  return fromDist;
}

function contentTypeForPath(relativePath: string): string {
  const dot = relativePath.lastIndexOf(".");
  if (dot === -1) {
    return "application/octet-stream";
  }
  return CONTENT_TYPES[relativePath.slice(dot).toLowerCase()] ??
    "application/octet-stream";
}

function resolvePluginAssetFile(request: PluginAssetRequest): string | null {
  const root = getPluginPublicRootDir();
  const absolute = normalize(join(root, request.plugin, request.relativePath));
  const rootWithSep = root.endsWith(sep) ? root : `${root}${sep}`;
  if (!absolute.startsWith(rootWithSep)) {
    return null;
  }
  if (!existsSync(absolute)) {
    return null;
  }
  return absolute;
}

export function servePluginAsset(
  pathname: string,
  method: string,
): globalThis.Response | null {
  const request = parsePluginAssetRequest(pathname);
  if (!request) {
    return null;
  }

  const filePath = resolvePluginAssetFile(request);
  if (!filePath) {
    return new globalThis.Response("Not Found", { status: 404 });
  }

  const contentType = contentTypeForPath(request.relativePath);
  if (method === "HEAD") {
    const body = readFileSync(filePath);
    return new globalThis.Response(null, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-length": String(body.byteLength),
      },
    });
  }

  const body = readFileSync(filePath);
  return new globalThis.Response(body, {
    status: 200,
    headers: { "content-type": contentType },
  });
}
