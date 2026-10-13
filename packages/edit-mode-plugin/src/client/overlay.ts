export interface OverlayRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OverlayHandlers {
  onChange: (element: HTMLElement, additive: boolean) => void;
  onPrompt: (prompt: string) => void;
  onClear: () => void;
  onLeaveHover: (next: EventTarget | null) => void;
}

export interface EditOverlay {
  setHover: (element: HTMLElement | null) => void;
  setSelection: (elements: readonly HTMLElement[]) => void;
  setMarquee: (rect: OverlayRect | null) => void;
  focusPrompt: () => void;
  isOverlayEvent: (event: Event) => boolean;
  destroy: () => void;
}

const HOST_ID = "sb-edit-overlay";

function unionRect(elements: readonly HTMLElement[]): OverlayRect | null {
  let top = Number.POSITIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let any = false;
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      continue;
    }
    any = true;
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  if (!any) {
    return null;
  }
  return { height: bottom - top, left, top, width: right - left };
}

function coversContent(left: number, top: number, width: number, height: number): boolean {
  const points = [left + 12, left + width / 2, left + width - 12];
  for (const x of points) {
    const hit = document.elementFromPoint(x, top + height / 2);
    if (hit !== null && hit !== document.body && hit !== document.documentElement && hit.id !== HOST_ID) {
      return true;
    }
  }
  return false;
}

function placeFixed(node: HTMLElement, top: number, left: number, width: number, height: number): void {
  const margin = 8;
  const nextLeft = Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - width - margin));
  const nextTop = Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - height - margin));
  node.style.top = `${nextTop}px`;
  node.style.left = `${nextLeft}px`;
}

export function createEditOverlay(handlers: OverlayHandlers): EditOverlay {
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "2147483646";
  const root = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    .chip[hidden], .bar[hidden], .marquee[hidden] { display: none !important; }
    .chip, .bar, .bar input, .bar button { font: 500 13px/1.2 ui-sans-serif, system-ui, sans-serif; }
    .chip, .bar button, .bar input { pointer-events: auto; }
    .tag {
      position: fixed;
      border-radius: 4px;
      background: #f5a024;
      color: #1f1405;
      padding: 5px 7px;
      font: 500 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      pointer-events: none;
    }
    .chip {
      position: fixed;
      border: 0;
      border-radius: 4px;
      background: #f5a024;
      color: #1f1405;
      padding: 5px 7px;
      font: 500 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      cursor: pointer;
    }
    .chip:focus-visible, .bar button:focus-visible, .bar input:focus { outline: 2px solid #0f6491; outline-offset: 2px; }
    .marquee {
      position: fixed;
      border: 1px dashed #f5a024;
      background: rgba(245, 160, 36, 0.16);
      pointer-events: none;
    }
    .bar {
      position: fixed;
      display: flex;
      gap: 8px;
      align-items: center;
      max-width: calc(100vw - 16px);
      padding: 8px;
      border-radius: 8px;
      background: #0c2333;
      color: #e8f1f7;
      box-shadow: 0 8px 24px rgba(17, 26, 34, 0.28);
    }
    .count { color: #93acbf; padding: 0 6px; font: 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
    .bar input {
      width: min(420px, 56vw);
      border: 1px solid #1d3d56;
      border-radius: 6px;
      background: #12304a;
      color: #e8f1f7;
      padding: 8px 10px;
      user-select: text;
    }
    .bar input::placeholder { color: #93acbf; }
    .apply, .clear { border: 0; border-radius: 6px; cursor: pointer; }
    .apply { background: #f5a024; color: #1f1405; padding: 6px 12px; font-weight: 500; }
    .apply:hover { background: #d9820f; }
    .apply:disabled { opacity: 0.45; cursor: default; }
    .clear { background: transparent; color: #93acbf; width: 28px; height: 28px; }
  `;

  const marquee = document.createElement("div");
  marquee.className = "marquee";
  marquee.hidden = true;

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = "Select";
  chip.title = "Select this element. Shift-click to add it.";
  chip.hidden = true;

  const bar = document.createElement("form");
  bar.className = "bar";
  bar.hidden = true;

  const count = document.createElement("span");
  count.className = "count";
  count.setAttribute("aria-live", "polite");

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Describe the change";
  input.setAttribute("aria-label", "Describe the change");
  input.autocomplete = "off";

  const apply = document.createElement("button");
  apply.type = "submit";
  apply.className = "apply";
  apply.textContent = "Apply";
  apply.disabled = true;

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "clear";
  clear.textContent = "×";
  clear.setAttribute("aria-label", "Clear selection");

  const tag = document.createElement("div");
  tag.className = "tag";
  tag.hidden = true;

  bar.append(count, input, apply, clear);
  root.append(style, marquee, chip, tag, bar);
  document.body.append(host);

  let hover: HTMLElement | null = null;
  let picked: readonly HTMLElement[] = [];

  function syncApply(): void {
    apply.disabled = input.value.trim() === "";
  }

  function elementLabel(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    const className = Array.from(element.classList).find((name) => !name.startsWith("sb-edit"));
    return className === undefined ? tagName : `${tagName}.${className}`;
  }

  function placeTag(): void {
    const element = picked[0];
    if (element === undefined) {
      tag.hidden = true;
      return;
    }
    tag.textContent = elementLabel(element);
    tag.hidden = false;
    const rect = element.getBoundingClientRect();
    const width = tag.offsetWidth || 72;
    const height = tag.offsetHeight || 22;
    placeFixed(tag, rect.top - height - 6, rect.left - 6, width, height);
  }

  function placeChip(): void {
    if (hover === null) {
      chip.hidden = true;
      return;
    }
    const rect = hover.getBoundingClientRect();
    chip.hidden = false;
    const width = chip.offsetWidth || 64;
    const height = chip.offsetHeight || 28;
    const inset = 4;
    const top = rect.height < height ? rect.top : rect.top + inset;
    const left = rect.width < width ? rect.left : rect.right - width - inset;
    placeFixed(chip, top, left, width, height);
  }

  function placeBar(): void {
    if (picked.length === 0) {
      bar.hidden = true;
      input.value = "";
      syncApply();
      return;
    }
    count.textContent = picked.length === 1 ? "1 selected" : `${picked.length} selected`;
    const rect = unionRect(picked);
    bar.hidden = false;
    const width = bar.offsetWidth || 320;
    const height = bar.offsetHeight || 44;
    if (rect === null) {
      placeFixed(bar, window.innerHeight - height - 16, (window.innerWidth - width) / 2, width, height);
      return;
    }
    const left = rect.left + rect.width / 2 - width / 2;
    const below = rect.top + rect.height + 8;
    const above = rect.top - height - 8;
    bar.hidden = true;
    const belowOk = below + height <= window.innerHeight - 8 && !coversContent(left, below, width, height);
    const aboveOk = above >= 8 && !coversContent(left, above, width, height);
    bar.hidden = false;
    let top = window.innerHeight - height - 16;
    if (belowOk) {
      top = below;
    } else if (aboveOk) {
      top = above;
    }
    placeFixed(bar, top, left, width, height);
  }

  function reposition(): void {
    placeChip();
    if (picked.length > 0) {
      placeBar();
      placeTag();
      return;
    }
    tag.hidden = true;
  }

  chip.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (hover === null) {
      return;
    }
    handlers.onChange(hover, event.shiftKey || event.metaKey);
  });
  chip.addEventListener("pointerout", (event) => {
    handlers.onLeaveHover(event.relatedTarget);
  });
  input.addEventListener("input", syncApply);
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      handlers.onClear();
    }
  });
  clear.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handlers.onClear();
  });
  bar.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handlers.onPrompt(input.value);
  });
  window.addEventListener("resize", reposition);
  document.addEventListener("scroll", reposition, true);

  return {
    destroy() {
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
      host.remove();
    },
    focusPrompt() {
      if (bar.hidden) {
        return;
      }
      input.focus({ preventScroll: true });
    },
    isOverlayEvent(event) {
      return event.composedPath().some((node) => node instanceof Element && node.id === HOST_ID);
    },
    setHover(element) {
      hover = element;
      placeChip();
    },
    setMarquee(rect) {
      if (rect === null || rect.width < 2 || rect.height < 2) {
        marquee.hidden = true;
        return;
      }
      marquee.hidden = false;
      marquee.style.top = `${rect.top}px`;
      marquee.style.left = `${rect.left}px`;
      marquee.style.width = `${rect.width}px`;
      marquee.style.height = `${rect.height}px`;
    },
    setSelection(elements) {
      picked = elements;
      placeBar();
      placeChip();
      placeTag();
    },
  };
}
