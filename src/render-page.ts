import { renderAsync } from "@hyperspan/html";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isPage, type SitePage, type RenderContext, toPageRenderView } from "./pages.js";
import type { SiteSettings } from "./site.js";
import { PageValidationError } from "./pages.js";
import { slotHasContent } from "./slot-content.js";
import { buildPageSlots, RenderError } from "./slot-handle.js";
import { renderStandardHead } from "./render-head.js";

export { RenderError } from "./slot-handle.js";

function validateRequiredSlots(page: SitePage): void {
  for (const required of page.template.requiredSlots) {
    const items = page.slots[required as keyof typeof page.slots];
    if (!items || items.length === 0 || !slotHasContent(items)) {
      throw new PageValidationError(
        `required slot "${required}" must have at least one module or non-empty HTML string`,
      );
    }
  }
}

export async function renderPage(
  page: SitePage,
  siteRoot: string,
  site: SiteSettings,
): Promise<string> {
  validateRequiredSlots(page);

  const ctx: RenderContext = { siteRoot, site };

  const slots = buildPageSlots(page, ctx);

  const head = renderStandardHead({
    title: page.template.formatPageTitle(page.title),
    meta: page.meta,
  });

  return renderAsync(
    page.template.render({
      head,
      site,
      page: toPageRenderView(page),
      slots,
    }),
  );
}

export async function renderPageFile(
  pagePath: string,
  siteRoot: string,
  site: SiteSettings,
): Promise<string> {
  const absolute = resolve(siteRoot, pagePath);
  const url = pathToFileURL(absolute).href;
  const imported = await import(url);
  const page = imported.default;

  if (!isPage(page)) {
    throw new RenderError(
      `${pagePath} must default-export a page from createPage()`,
    );
  }

  return renderPage(page, siteRoot, site);
}
