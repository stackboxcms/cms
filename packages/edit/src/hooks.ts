import { fileURLToPath } from "node:url";
import { isBlock } from "@stackbox/cms";
import type { Stackbox as SB } from "@stackbox/cms";
import { EDIT_SCRIPT_PATH } from "./protocol.js";

export function isEditRequest(request: Request): boolean {
  return new URL(request.url).searchParams.get("sbedit") === "1";
}

export function normalizeSource(source: string): string {
  if (source.startsWith("file:")) {
    return fileURLToPath(source);
  }
  return source;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

const EDIT_STYLE = `<style id="sb-edit-style">sb-edit{display:contents}.sb-edit-hover{outline:2px solid #3b82f6;outline-offset:2px}</style>`;

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
        attrs.push(`page-source="${escapeAttr(normalizeSource(info.page.source))}"`);
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
        ...(info.page.source ? { source: normalizeSource(info.page.source) } : {}),
      }).replace(/</g, "\\u003c");

      const tail = `${EDIT_STYLE}<script type="application/json" id="sb-edit-page">${pageJson}</script><script src="${EDIT_SCRIPT_PATH}"></script>`;

      if (html.includes("</body>")) {
        return html.replace("</body>", `${tail}</body>`);
      }

      return `${html}${tail}`;
    },

    beforeResponse(response, info) {
      if (!isEditRequest(info.request)) {
        return response;
      }

      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store");
      return new Response(response.body, {
        headers,
        status: response.status,
        statusText: response.statusText,
      });
    },
  };
}
