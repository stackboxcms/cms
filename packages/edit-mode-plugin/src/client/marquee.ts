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
const MAX_EDGE_RATIO = 1.35;
const MAX_AREA_RATIO = 4;

export function intersects(a: MarqueeRect, b: MarqueeRect): boolean {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

function fullyInside(box: MarqueeRect, marquee: MarqueeRect): boolean {
  return (
    box.left >= marquee.left &&
    box.top >= marquee.top &&
    box.left + box.width <= marquee.left + marquee.width &&
    box.top + box.height <= marquee.top + marquee.height
  );
}

export function pickMarqueeIds(boxes: MarqueeBox[], marquee: MarqueeRect): number[] {
  const area = Math.max(marquee.width * marquee.height, 1);
  const byId = new Map(boxes.map((box) => [box.id, box]));
  const hits = new Set<number>();
  for (const box of boxes) {
    if (box.width < MIN_EDGE || box.height < MIN_EDGE || !intersects(box, marquee)) {
      continue;
    }
    const spills =
      box.width > marquee.width * MAX_EDGE_RATIO ||
      box.height > marquee.height * MAX_EDGE_RATIO ||
      box.width * box.height > area * MAX_AREA_RATIO;
    if (spills && !fullyInside(box, marquee)) {
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
