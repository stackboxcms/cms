import { renderAsync } from "@hyperspan/html";
import {
  toPageRenderView,
  PageValidationError,
} from "./pages.js";
import { slotHasContent } from "./slot-content.js";
import { buildPageSlots, RenderError } from "./slot-handle.js";
import { renderStandardHead } from "./render-head.js";
import type { Stackbox as SB } from "./types.js";

export { RenderError } from "./slot-handle.js";

function validateRequiredSlots(page: SB.SitePage): void {
  for (const required of page.template.requiredSlots) {
    const items = page.slots[required as keyof typeof page.slots];
    if (!items || items.length === 0 || !slotHasContent(items)) {
      throw new PageValidationError(
        `required slot "${required}" must have at least one block or non-empty HTML string`,
      );
    }
  }
}

export async function renderPage(
  page: SB.SitePage,
  siteConfig: SB.SiteConfig,
  ctx?: SB.Context,
  hooks?: SB.SiteHooks,
): Promise<string> {
  validateRequiredSlots(page);

  const renderCtx: SB.RenderContext = { siteConfig, ctx, page, hooks };

  const slots = buildPageSlots(page, renderCtx);

  const head = renderStandardHead({
    title: page.template.formatPageTitle(page.title),
    meta: page.meta,
  });

  let html = await renderAsync(
    page.template.render({
      head,
      siteConfig,
      page: toPageRenderView(page),
      slots,
    }),
  );

  if (hooks?.afterRender) {
    html = await hooks.afterRender(html, { page, ctx });
  }

  return html;
}
