import { fileURLToPath } from "node:url";
import { isBlock } from "../src/blocks.js";
import type { Stackbox as SB } from "../src/types.js";

export function isEditRequest(request: Request): boolean {
  const edit = new URL(request.url).searchParams.get("edit");
  return edit === "1" || edit === "true";
}

export function normalizeSource(source: string): string {
  if (source.startsWith("file:")) {
    return fileURLToPath(source);
  }
  return source;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

const EDIT_STYLE = `<style id="sb-edit-style">
sb-edit {
  display: block;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
}
sb-edit:hover {
  outline-color: #3b82f6;
}
</style>`;

export function createEditHooks(): SB.SiteHooks {
  return {
    shouldCache(request) {
      return !isEditRequest(request);
    },

    renderSlotItem(html, info) {
      const request = info.ctx?.req.raw;
      if (!request || !isEditRequest(request)) {
        return html;
      }

      const attrs = [
        `slot="${escapeAttr(info.slot)}"`,
        `index="${info.index}"`,
        `kind="${isBlock(info.item) ? "block" : "html"}"`,
      ];

      if (isBlock(info.item)) {
        attrs.push(`name="${escapeAttr(info.item.name)}"`);
        if (info.item.source) {
          attrs.push(`source="${escapeAttr(normalizeSource(info.item.source))}"`);
        }
      }

      if (info.page.source) {
        attrs.push(
          `page-source="${escapeAttr(normalizeSource(info.page.source))}"`,
        );
      }

      return `<sb-edit ${attrs.join(" ")}>${html}</sb-edit>`;
    },

    afterRender(html, info) {
      const request = info.ctx?.req.raw;
      if (!request || !isEditRequest(request)) {
        return html;
      }

      const pageJson = JSON.stringify({
        path: info.page.path,
        title: info.page.title,
        ...(info.page.source
          ? { source: normalizeSource(info.page.source) }
          : {}),
      });

      const script = `<script type="application/json" id="sb-edit-page">${pageJson}</script>`;

      if (html.includes("</head>")) {
        return html.replace("</head>", `${EDIT_STYLE}${script}</head>`);
      }

      return `${EDIT_STYLE}${script}${html}`;
    },

    beforeResponse(response, info) {
      if (!isEditRequest(info.request)) {
        return response;
      }

      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
  };
}
