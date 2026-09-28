const SKIP_HREF = /^(?:mailto:|tel:|javascript:)/i;

export function hrefWithEdit(href: string, baseHref: string): string | null {
  const trimmed = href.trim();
  if (trimmed === "" || trimmed.startsWith("#") || SKIP_HREF.test(trimmed)) {
    return null;
  }

  let base: URL;
  let url: URL;
  try {
    base = new URL(baseHref);
    url = new URL(trimmed, base);
  } catch {
    return null;
  }

  if (url.origin !== base.origin) {
    return null;
  }

  if (url.searchParams.get("sbedit") === "1") {
    return null;
  }

  url.searchParams.set("sbedit", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}
