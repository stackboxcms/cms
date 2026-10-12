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
    const marquee: MarqueeRect = { height: 150, left: 0, top: 0, width: 250 };
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

  it("keeps the cards inside a row that is wider than the drag", () => {
    const row = box(0, null, 0, 0, 2000, 140);
    const left = box(1, 0, 10, 10, 200, 120);
    const right = box(2, 0, 230, 10, 200, 120);
    const marquee: MarqueeRect = { height: 140, left: 0, top: 0, width: 450 };
    assert.deepEqual(pickMarqueeIds([row, left, right], marquee), [1, 2]);
  });

  it("returns nothing when the drag misses every element", () => {
    const marquee: MarqueeRect = { height: 10, left: 5000, top: 5000, width: 10 };
    assert.deepEqual(pickMarqueeIds([shell, cardA], marquee), []);
  });
});
