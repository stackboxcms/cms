import { hrefWithEdit } from "../edit-url.js";
import { EDIT_PAGE_SOURCE, EDITOR_APP_SOURCE, EDIT_PLUGIN_VERSION } from "../protocol.js";
import type { EditBlockInfo, EditElementContext, EditMode, EditPageInfo, EditTarget } from "../protocol.js";
import { pickMarqueeIds, rectFromPoints } from "./marquee.js";
import type { MarqueeBox } from "./marquee.js";
import { createEditOverlay } from "./overlay.js";
import type { EditOverlay } from "./overlay.js";

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
const SKIP_TAGS = new Set(["NOSCRIPT", "SCRIPT", "STYLE", "SB-EDIT"]);
const MAX_SELECTED = 40;
const DRAG_DISTANCE = 25;

let mode: EditMode = "off";
let hovered: HTMLElement | null = null;
let editing: { element: HTMLElement; before: string; cancelled: boolean } | null = null;
let selected: HTMLElement[] = [];
let overlay: EditOverlay | null = null;
let drag: { x: number; y: number; active: boolean; additive: boolean; pointerId: number } | null = null;
let suppressClick = false;

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

function clip(value: string, max: number): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= max) {
    return compact;
  }
  return `${compact.slice(0, max)}…`;
}

function snippet(element: HTMLElement): string {
  const copy = element.cloneNode(true);
  if (!(copy instanceof HTMLElement)) {
    return clip(element.outerHTML, 400);
  }
  for (const node of [copy, ...Array.from(copy.querySelectorAll("*"))]) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    node.removeAttribute("data-sb-edit-target");
    node.classList.remove("sb-edit-hover", "sb-edit-selected");
    if (node.classList.length === 0) {
      node.removeAttribute("class");
    }
  }
  return clip(copy.outerHTML, 400);
}

function describeElement(element: HTMLElement): EditTarget {
  return {
    context: contextFor(element),
    html: snippet(element),
    tag: element.tagName.toLowerCase(),
    text: clip(element.innerText || element.textContent || "", 180),
  };
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
  overlay?.setHover(null);
}

function sameSelection(next: HTMLElement[]): boolean {
  if (next.length !== selected.length) {
    return false;
  }
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] !== selected[index]) {
      return false;
    }
  }
  return true;
}

function setSelected(next: HTMLElement[]): void {
  const capped = next.slice(0, MAX_SELECTED);
  if (sameSelection(capped)) {
    overlay?.setSelection(selected);
    return;
  }
  for (const element of selected) {
    element.classList.remove("sb-edit-selected");
  }
  selected = capped;
  for (const element of selected) {
    element.classList.add("sb-edit-selected");
  }
  overlay?.setSelection(selected);
  postToApp({ targets: selected.map(describeElement), type: "select" });
}

function toggleSelected(element: HTMLElement, additive: boolean): void {
  if (!additive) {
    setSelected([element]);
    overlay?.focusPrompt();
    return;
  }
  if (selected.includes(element)) {
    setSelected(selected.filter((item) => item !== element));
    return;
  }
  setSelected([...selected, element]);
  overlay?.focusPrompt();
}

function canSelect(element: HTMLElement | null): element is HTMLElement {
  return element !== null && element.id !== "sb-edit-overlay" && element.closest("#sb-edit-overlay") === null;
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

function elementFromTarget(target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) {
    return target;
  }
  if (target instanceof Element) {
    return target.parentElement;
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
  setSelected([]);
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

function smallestTextMatch(root: ParentNode, beforeText: string): HTMLElement | null {
  const nodes: HTMLElement[] = [];
  if (root instanceof HTMLElement) {
    nodes.push(root);
  }
  for (const node of Array.from(root.querySelectorAll("*"))) {
    if (node instanceof HTMLElement) {
      nodes.push(node);
    }
  }
  let best: HTMLElement | null = null;
  let bestCount = Number.POSITIVE_INFINITY;
  for (const node of nodes) {
    if ((node.textContent ?? "") !== beforeText) {
      continue;
    }
    const count = node.querySelectorAll("*").length;
    if (count < bestCount) {
      best = node;
      bestCount = count;
    }
  }
  return best;
}

function applyText(record: Record<string, unknown>): void {
  const beforeText = typeof record.beforeText === "string" ? record.beforeText : "";
  const afterText = typeof record.afterText === "string" ? record.afterText : "";
  if (beforeText === "" && afterText === "") {
    return;
  }
  const path = typeof record.path === "string" ? record.path : "";
  if (path !== "" && path !== pageInfo().path) {
    return;
  }
  const selector = typeof record.selector === "string" ? record.selector : "";
  if (selector !== "") {
    const selectedNode = document.querySelector(selector);
    if (selectedNode instanceof HTMLElement && (selectedNode.textContent ?? "") === beforeText) {
      selectedNode.textContent = afterText;
      return;
    }
  }
  let root: ParentNode = document.body;
  const slot = typeof record.slot === "string" ? record.slot : "";
  const index = typeof record.index === "string" ? record.index : "";
  if (slot !== "") {
    const block = document.querySelector(`sb-edit[slot="${CSS.escape(slot)}"][index="${CSS.escape(index)}"]`);
    if (block instanceof HTMLElement) {
      root = block;
    }
  }
  const match = smallestTextMatch(root, beforeText);
  if (match !== null) {
    match.textContent = afterText;
  }
}

function parentBoxId(element: HTMLElement, ids: Map<HTMLElement, number>): number | null {
  let parent = element.parentElement;
  while (parent !== null) {
    const id = ids.get(parent);
    if (id !== undefined) {
      return id;
    }
    parent = parent.parentElement;
  }
  return null;
}

function collectBoxes(): { boxes: MarqueeBox[]; elements: HTMLElement[] } {
  const elements: HTMLElement[] = [];
  const ids = new Map<HTMLElement, number>();
  const boxes: MarqueeBox[] = [];
  for (const node of Array.from(document.body.querySelectorAll("*"))) {
    if (!(node instanceof HTMLElement) || SKIP_TAGS.has(node.tagName) || node.closest("#sb-edit-overlay") !== null) {
      continue;
    }
    const id = elements.length;
    elements.push(node);
    ids.set(node, id);
    const rect = node.getBoundingClientRect();
    boxes.push({
      height: rect.height,
      id,
      left: rect.left,
      parentId: parentBoxId(node, ids),
      top: rect.top,
      width: rect.width,
    });
  }
  return { boxes, elements };
}

function selectMarquee(rect: { top: number; left: number; width: number; height: number }, additive: boolean): void {
  const { boxes, elements } = collectBoxes();
  const picked = pickMarqueeIds(boxes, rect)
    .map((id) => elements[id])
    .filter((element): element is HTMLElement => element !== undefined);
  if (picked.length === 0) {
    return;
  }
  if (!additive) {
    setSelected(picked);
    overlay?.focusPrompt();
    return;
  }
  const merged = [...selected];
  for (const element of picked) {
    if (!merged.includes(element)) {
      merged.push(element);
    }
  }
  setSelected(merged);
  overlay?.focusPrompt();
}

function stopDrag(): void {
  drag = null;
  document.removeEventListener("pointermove", onPointerMove, true);
  document.removeEventListener("pointerup", onPointerUp, true);
  document.removeEventListener("pointercancel", onPointerUp, true);
  overlay?.setMarquee(null);
}

function onPointerMove(event: PointerEvent): void {
  if (drag === null || event.pointerId !== drag.pointerId) {
    return;
  }
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.active && dx * dx + dy * dy < DRAG_DISTANCE) {
    return;
  }
  drag.active = true;
  event.preventDefault();
  clearHover();
  overlay?.setMarquee(rectFromPoints(drag.x, drag.y, event.clientX, event.clientY));
}

function onPointerUp(event: PointerEvent): void {
  if (drag === null || event.pointerId !== drag.pointerId) {
    return;
  }
  const current = drag;
  const cancelled = event.type === "pointercancel";
  stopDrag();
  if (!current.active || cancelled) {
    return;
  }
  suppressClick = true;
  selectMarquee(rectFromPoints(current.x, current.y, event.clientX, event.clientY), current.additive);
}

function onPointerDown(event: PointerEvent): void {
  suppressClick = false;
  if (mode !== "elements" || editing !== null || event.button !== 0 || drag !== null) {
    return;
  }
  if (overlay?.isOverlayEvent(event) === true) {
    return;
  }
  drag = {
    active: false,
    additive: event.shiftKey || event.metaKey,
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
  document.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", onPointerUp, true);
}

function setMode(next: EditMode): void {
  mode = next;
  document.documentElement.classList.toggle("sb-edit-on", next === "elements");
  if (next === "elements") {
    return;
  }
  stopDrag();
  clearHover();
  cancelEdit();
  setSelected([]);
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
    setMode(record.mode);
  }
  if (record.type === "clear-selection") {
    setSelected([]);
  }
  if (
    record.type === "revert" &&
    typeof record.selector === "string" &&
    typeof record.beforeText === "string" &&
    typeof record.afterText === "string"
  ) {
    revertText(record.selector, record.beforeText, record.afterText);
  }
  if (record.type === "apply") {
    applyText(record);
  }
}

function overlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false;
  }
  const host = document.querySelector("#sb-edit-overlay");
  return host !== null && (target === host || host.contains(target));
}

function onPointerOver(event: PointerEvent): void {
  if (mode !== "elements" || editing !== null || drag?.active === true || overlay?.isOverlayEvent(event) === true) {
    return;
  }
  const element = event.target instanceof HTMLElement ? event.target : null;
  if (!canSelect(element)) {
    return;
  }
  if (hovered !== null && hovered !== element) {
    hovered.classList.remove("sb-edit-hover");
  }
  hovered = element;
  element.classList.add("sb-edit-hover");
  overlay?.setHover(element);
}

function onPointerOut(event: PointerEvent): void {
  if (event.target !== hovered) {
    return;
  }
  if (overlayTarget(event.relatedTarget) || overlayTarget(document.elementFromPoint(event.clientX, event.clientY))) {
    return;
  }
  clearHover();
}

function onClick(event: MouseEvent): void {
  const anchor = event.target instanceof Element ? event.target.closest("a") : null;
  if (anchor !== null) {
    rewriteAnchor(anchor);
  }
  if (suppressClick) {
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (overlay?.isOverlayEvent(event) === true || mode !== "elements" || editing !== null) {
    return;
  }
  const element = elementFromTarget(event.target);
  if (!canSelect(element)) {
    return;
  }
  if (event.shiftKey || event.metaKey) {
    event.preventDefault();
    event.stopPropagation();
    toggleSelected(element, true);
    return;
  }
  const text = textElement(event.target);
  if (text !== null) {
    event.preventDefault();
    event.stopPropagation();
    beginEdit(text);
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  toggleSelected(element, false);
}

function onKeyDown(event: KeyboardEvent): void {
  if (editing !== null) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commitEdit();
    }
    return;
  }
  if (event.key === "Escape" && selected.length > 0) {
    event.preventDefault();
    setSelected([]);
  }
}

function onBlur(event: FocusEvent): void {
  if (editing !== null && event.target === editing.element) {
    commitEdit();
  }
}

function onDragStart(event: DragEvent): void {
  if (mode === "elements") {
    event.preventDefault();
  }
}

function submitPrompt(prompt: string): void {
  const text = prompt.trim();
  if (text === "" || selected.length === 0) {
    return;
  }
  postToApp({
    prompt: text,
    targets: selected.map(describeElement),
    type: "prompt",
  });
  setSelected([]);
}

function boot(): void {
  if (document.querySelector("#sb-edit-page") === null || document.querySelector("#sb-edit-overlay") !== null) {
    return;
  }
  overlay = createEditOverlay({
    onChange(element, additive) {
      if (!canSelect(element)) {
        return;
      }
      clearHover();
      toggleSelected(element, additive);
    },
    onClear() {
      setSelected([]);
    },
    onLeaveHover(next) {
      if (hovered !== null && next instanceof Node && (next === hovered || hovered.contains(next))) {
        return;
      }
      clearHover();
    },
    onPrompt: submitPrompt,
  });
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
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("focusout", onBlur);
  document.addEventListener("dragstart", onDragStart);
  postToApp({ page: pageInfo(), type: "ready", version: EDIT_PLUGIN_VERSION });
  postToApp(helloPayload());
}

boot();
