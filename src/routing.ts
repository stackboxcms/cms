export function normalizePathname(pathname: string): string {
  if (pathname === "" || pathname === "/") {
    return "/";
  }
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function matchPagePath(
  pathname: string,
  pagePath: string,
): boolean {
  return normalizePathname(pathname) === normalizePathname(pagePath);
}
