import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickMarqueeIds } from "../src/client/marquee.js";
import type { MarqueeBox, MarqueeRect } from "../src/client/marquee.js";

function box(id: number, parentId: number | null, left: number, top: number, width: number, height: number): MarqueeBox {
  return { height, id, left, parentId, top, width };
}

const shell = box(0, null, 0, 0, 1000, 1000);
const cardA = box(1, 0, 10, 10, 100, 100);
const titleA = box(2, 1, 20, 20, 80, 20);
const cardB = box(3, 0, 200, 10, 100, 100);

describe("pickMarqueeIds", () => {
  it("keeps sibling cards and skips the page shell and nested text", () => {
    const marquee: MarqueeRect = { height: 120, left: 0, top: 0, width: 320 };
    const ids = pickMarqueeIds([shell, cardA, titleA, cardB], marquee);
    assert.deepEqual(ids, [1, 3]);
  });

  it("keeps a card when the drag covers that card and its text", () => {
    const marquee: MarqueeRect = { height: 110, left: 5, top: 5, width: 110 };
    const ids = pickMarqueeIds([shell, cardA, titleA, cardB], marquee);
    assert.deepEqual(ids, [1]);
  });

  it("keeps a small element when its parent is larger than the drag", () => {
    const wideCard = box(1, 0, 0, 0, 400, 400);
    const title = box(2, 1, 20, 20, 80, 20);
    const marquee: MarqueeRect = { height: 30, left: 15, top: 15, width: 90 };
    const ids = pickMarqueeIds([shell, wideCard, title], marquee);
    assert.deepEqual(ids, [2]);
  });

  it("keeps stacked elements a thin vertical drag covers in height", () => {
    const row = box(0, null, 0, 0, 2000, 800);
    const top = box(1, 0, 10, 20, 400, 100);
    const middle = box(2, 0, 10, 140, 400, 100);
    const below = box(3, 0, 10, 400, 400, 100);
    const title = box(4, 1, 20, 30, 200, 24);
    const marquee: MarqueeRect = { height: 250, left: 40, top: 10, width: 16 };
    assert.deepEqual(pickMarqueeIds([row, top, middle, below, title], marquee), [1, 2]);
  });

  it("keeps wide elements a short horizontal drag covers in width", () => {
    const titleB = box(4, 3, 210, 20, 80, 20);
    const marquee: MarqueeRect = { height: 16, left: 0, top: 40, width: 320 };
    assert.deepEqual(pickMarqueeIds([shell, cardA, titleA, cardB, titleB], marquee), [1, 3]);
  });

  it("skips a parent that still contains an element outside the drag", () => {
    const stack = box(0, null, 0, 0, 400, 360);
    const top = box(1, 0, 0, 0, 400, 100);
    const middle = box(2, 0, 0, 120, 400, 100);
    const bottom = box(3, 0, 0, 240, 400, 100);
    const marquee: MarqueeRect = { height: 230, left: 20, top: 0, width: 16 };
    assert.deepEqual(pickMarqueeIds([stack, top, middle, bottom], marquee), [1, 2]);
  });

  it("keeps an element when most of one side sits inside the drag", () => {
    const card = box(1, 0, 0, 0, 100, 100);
    const marquee: MarqueeRect = { height: 70, left: 0, top: 0, width: 20 };
    assert.deepEqual(pickMarqueeIds([shell, card], marquee), [1]);
  });

  it("skips an element that only overlaps the drag", () => {
    const marquee: MarqueeRect = { height: 20, left: 0, top: 0, width: 40 };
    assert.deepEqual(pickMarqueeIds([shell, cardA, titleA], marquee), []);
  });

  it("returns nothing when the drag misses every element", () => {
    const marquee: MarqueeRect = { height: 10, left: 5000, top: 5000, width: 10 };
    assert.deepEqual(pickMarqueeIds([shell, cardA], marquee), []);
  });
});
