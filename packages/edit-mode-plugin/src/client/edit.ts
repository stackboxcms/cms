import { hrefWithEdit } from "../edit-url.js";
import { EDIT_PAGE_SOURCE, EDITOR_APP_SOURCE, EDIT_PLUGIN_VERSION } from "../protocol.js";
import type { EditBlockInfo, EditElementContext, EditMode, EditPageInfo } from "../protocol.js";

const TEXT_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BUTTON",
  "CITE",
  "DD",
  "DT",
  "EM",
  "FIGCAPTION",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "I",
  "LABEL",
  "LI",
  "P",
  "SMALL",
  "SPAN",
  "STRONG",
  "SUMMARY",
  "TD",
  "TH",
]);

const FRAME_TARGETS = new Set(["_blank", "_parent", "_top"]);

let mode: EditMode = "off";
let hovered: HTMLElement | null = null;
let editing: { element: HTMLElement; before: string; cancelled: boolean } | null = null;

function pageInfo(): EditPageInfo {
  const node = document.querySelector("#sb-edit-page");
  if (node === null) {
    return { path: location.pathname, title: document.title };
  }
  try {
    const parsed: unknown = JSON.parse(node.textContent ?? "");
    if (typeof parsed !== "object" || parsed === null) {
      return { path: location.pathname, title: document.title };
    }
    const record = parsed as Record<string, unknown>;
    const path = typeof record.path === "string" ? record.path : location.pathname;
    const title = typeof record.title === "string" ? record.title : document.title;
    const source = typeof record.source === "string" ? record.source : undefined;
    return source === undefined ? { path, title } : { path, title, source };
  } catch {
    return { path: location.pathname, title: document.title };
  }
}

function blockInfo(element: Element): EditBlockInfo | undefined {
  const wrap = element.closest("sb-edit");
  if (wrap === null) {
    return undefined;
  }
  const name = wrap.getAttribute("name");
  const source = wrap.getAttribute("source");
  return {
    index: wrap.getAttribute("index") ?? "",
    kind: wrap.getAttribute("kind") ?? "",
    slot: wrap.getAttribute("slot") ?? "",
    ...(name === null ? {} : { name }),
    ...(source === null ? {} : { source }),
  };
}

function contextFor(element: Element): EditElementContext {
  const block = blockInfo(element);
  return {
    page: pageInfo(),
    selector: selectorFor(element),
    ...(block === undefined ? {} : { block }),
  };
}

function selectorFor(element: Element): string {
  const existing = element.getAttribute("data-sb-edit-target");
  if (existing !== null && existing !== "") {
    return `[data-sb-edit-target="${existing}"]`;
  }
  const id = crypto.randomUUID();
  element.setAttribute("data-sb-edit-target", id);
  return `[data-sb-edit-target="${id}"]`;
}

function helloPayload(): { type: "hello"; version: string } {
  return { type: "hello", version: EDIT_PLUGIN_VERSION };
}

function postToApp(message: Record<string, unknown>): void {
  if (window.parent === window) {
    return;
  }
  window.parent.postMessage({ source: EDIT_PAGE_SOURCE, ...message }, "*");
}

function clearHover(): void {
  hovered?.classList.remove("sb-edit-hover");
  hovered = null;
}

function hasDirectText(element: HTMLElement): boolean {
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "") {
      return true;
    }
  }
  return false;
}

function textElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  let current: HTMLElement | null = target instanceof HTMLElement ? target : target.parentElement;
  while (current !== null && current !== document.body) {
    const editable = TEXT_TAGS.has(current.tagName) || current.childElementCount === 0;
    if (editable && hasDirectText(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function commitEdit(): void {
  const current = editing;
  if (current === null || current.cancelled) {
    editing = null;
    return;
  }
  editing = null;
  current.element.contentEditable = "false";
  const after = current.element.textContent ?? "";
  if (after === current.before) {
    return;
  }
  postToApp({
    after: { text: after },
    before: { text: current.before },
    context: contextFor(current.element),
    editType: "text",
    type: "edit",
  });
}

function cancelEdit(): void {
  const current = editing;
  if (current === null) {
    return;
  }
  current.cancelled = true;
  editing = null;
  current.element.textContent = current.before;
  current.element.contentEditable = "false";
}

function beginEdit(element: HTMLElement): void {
  if (editing !== null) {
    return;
  }
  const before = element.textContent ?? "";
  editing = { before, cancelled: false, element };
  clearHover();
  element.contentEditable = "true";
  element.focus();
}

function rewriteAnchor(anchor: HTMLAnchorElement): void {
  if (FRAME_TARGETS.has(anchor.target) || anchor.hasAttribute("download")) {
    return;
  }
  const raw = anchor.getAttribute("href");
  if (raw === null) {
    return;
  }
  const next = hrefWithEdit(raw, location.href);
  if (next === null) {
    return;
  }
  anchor.setAttribute("href", next);
}

function rewriteTree(root: ParentNode): void {
  if (root instanceof HTMLAnchorElement) {
    rewriteAnchor(root);
  }
  if (root instanceof Element) {
    for (const anchor of Array.from(root.querySelectorAll("a"))) {
      rewriteAnchor(anchor);
    }
  }
}

function revertText(selector: string, beforeText: string, afterText: string): void {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    return;
  }
  if ((element.textContent ?? "") !== afterText) {
    return;
  }
  element.textContent = beforeText;
}

function onMessage(event: MessageEvent): void {
  if (event.source !== window.parent) {
    return;
  }
  const data: unknown = event.data;
  if (typeof data !== "object" || data === null) {
    return;
  }
  const record = data as Record<string, unknown>;
  if (record.source !== EDITOR_APP_SOURCE) {
    return;
  }
  if (record.type === "hello") {
    postToApp(helloPayload());
    return;
  }
  if (record.type === "mode" && (record.mode === "off" || record.mode === "elements" || record.mode === "chat")) {
    mode = record.mode;
    if (mode !== "elements") {
      clearHover();
      cancelEdit();
    }
  }
  if (
    record.type === "revert" &&
    typeof record.selector === "string" &&
    typeof record.beforeText === "string" &&
    typeof record.afterText === "string"
  ) {
    revertText(record.selector, record.beforeText, record.afterText);
  }
}

function onPointerOver(event: PointerEvent): void {
  if (mode !== "elements" || editing !== null) {
    return;
  }
  const element = event.target instanceof HTMLElement ? event.target : null;
  if (element === null || element === document.body || element === document.documentElement) {
    return;
  }
  if (hovered !== null && hovered !== element) {
    hovered.classList.remove("sb-edit-hover");
  }
  hovered = element;
  element.classList.add("sb-edit-hover");
}

function onPointerOut(event: PointerEvent): void {
  if (event.target === hovered) {
    clearHover();
  }
}

function onClick(event: MouseEvent): void {
  const anchor = event.target instanceof Element ? event.target.closest("a") : null;
  if (anchor !== null) {
    rewriteAnchor(anchor);
  }
  if (mode !== "elements" || editing !== null) {
    return;
  }
  const text = textElement(event.target);
  if (text !== null) {
    event.preventDefault();
    event.stopPropagation();
    beginEdit(text);
    return;
  }
  if (event.target instanceof Element) {
    postToApp({ context: contextFor(event.target), type: "select" });
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (editing === null) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    cancelEdit();
    return;
  }
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    commitEdit();
  }
}

function onBlur(event: FocusEvent): void {
  if (editing !== null && event.target === editing.element) {
    commitEdit();
  }
}

function boot(): void {
  if (document.querySelector("#sb-edit-page") === null) {
    return;
  }
  rewriteTree(document);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of Array.from(record.addedNodes)) {
        if (node instanceof Element) {
          rewriteTree(node);
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("message", onMessage);
  document.addEventListener("pointerover", onPointerOver);
  document.addEventListener("pointerout", onPointerOut);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("focusout", onBlur);
  postToApp({ page: pageInfo(), type: "ready", version: EDIT_PLUGIN_VERSION });
  postToApp(helloPayload());
}

boot();
