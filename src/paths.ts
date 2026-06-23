import { join } from "node:path";

export function urlPathToOutputFile(path: string): string {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  if (normalized === "") {
    return "index.html";
  }
  return `${normalized}/index.html`;
}

export function resolveSiteRoot(repoRoot: string, siteName: string): string {
  return join(repoRoot, "sites", siteName);
}

export function resolveSiteDist(siteRoot: string): string {
  return join(siteRoot, "dist");
}
