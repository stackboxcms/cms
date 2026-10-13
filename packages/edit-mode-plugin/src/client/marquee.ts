export interface MarqueeRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface MarqueeBox extends MarqueeRect {
  id: number;
  parentId: number | null;
}

const MIN_EDGE = 2;
const MOSTLY_INSIDE = 0.6;

function coverage(start: number, size: number, rangeStart: number, rangeSize: number): number {
  const overlap = Math.min(start + size, rangeStart + rangeSize) - Math.max(start, rangeStart);
  if (overlap <= 0 || size <= 0) {
    return 0;
  }
  return overlap / size;
}

function axisCoverage(box: MarqueeRect, marquee: MarqueeRect): { across: number; down: number } {
  return {
    across: coverage(box.left, box.width, marquee.left, marquee.width),
    down: coverage(box.top, box.height, marquee.top, marquee.height),
  };
}

function mostlyInside(box: MarqueeRect, marquee: MarqueeRect): boolean {
  const { across, down } = axisCoverage(box, marquee);
  if (across <= 0 || down <= 0) {
    return false;
  }
  return across >= MOSTLY_INSIDE || down >= MOSTLY_INSIDE;
}

function descendsFrom(box: MarqueeBox, ancestorId: number, byId: Map<number, MarqueeBox>): boolean {
  let parentId = box.parentId;
  while (parentId !== null) {
    if (parentId === ancestorId) {
      return true;
    }
    parentId = byId.get(parentId)?.parentId ?? null;
  }
  return false;
}

function containsElementOutside(box: MarqueeBox, marquee: MarqueeRect, boxes: MarqueeBox[], byId: Map<number, MarqueeBox>): boolean {
  const { across, down } = axisCoverage(box, marquee);
  const byWidth = across >= MOSTLY_INSIDE;
  const byHeight = down >= MOSTLY_INSIDE;
  for (const other of boxes) {
    if (!descendsFrom(other, box.id, byId)) {
      continue;
    }
    const child = axisCoverage(other, marquee);
    if (byHeight && child.across > 0 && child.down <= 0) {
      return true;
    }
    if (byWidth && child.down > 0 && child.across <= 0) {
      return true;
    }
  }
  return false;
}

export function pickMarqueeIds(boxes: MarqueeBox[], marquee: MarqueeRect): number[] {
  const byId = new Map(boxes.map((box) => [box.id, box]));
  const hits = new Set<number>();
  for (const box of boxes) {
    if (box.width < MIN_EDGE || box.height < MIN_EDGE || !mostlyInside(box, marquee)) {
      continue;
    }
    if (containsElementOutside(box, marquee, boxes, byId)) {
      continue;
    }
    hits.add(box.id);
  }

  const kept: number[] = [];
  for (const id of hits) {
    let parentId = byId.get(id)?.parentId ?? null;
    let covered = false;
    while (parentId !== null) {
      if (hits.has(parentId)) {
        covered = true;
        break;
      }
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    if (!covered) {
      kept.push(id);
    }
  }
  return kept;
}

export function rectFromPoints(x1: number, y1: number, x2: number, y2: number): MarqueeRect {
  return {
    height: Math.abs(y2 - y1),
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
  };
}
