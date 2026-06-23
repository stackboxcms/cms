import { renderAsync } from "@hyperspan/html";
import {
  type SitePage,
  type RenderContext,
  toPageRenderView,
  PageValidationError,
} from "./pages.js";
import type { SiteConfig } from "./site.js";
import type { Stackbox } from "./stackbox/context.js";
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
  siteConfig: SiteConfig,
  ctx?: Stackbox.Context,
): Promise<string> {
  validateRequiredSlots(page);

  const renderCtx: RenderContext = { siteConfig, ctx };

  const slots = buildPageSlots(page, renderCtx);

  const head = renderStandardHead({
    title: page.template.formatPageTitle(page.title),
    meta: page.meta,
  });

  return renderAsync(
    page.template.render({
      head,
      siteConfig,
      page: toPageRenderView(page),
      slots,
    }),
  );
}
