import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hrefWithEdit } from "../src/edit-url.js";

const base = "https://site.example/?sbedit=1";

describe("hrefWithEdit", () => {
  it("adds sbedit=1 to a same-origin path and keeps other params", () => {
    assert.equal(hrefWithEdit("/about?x=1", base), "/about?x=1&sbedit=1");
  });

  it("leaves a link that already has sbedit=1 unchanged", () => {
    assert.equal(hrefWithEdit("/about?sbedit=1", base), null);
  });

  it("replaces any other sbedit value with 1", () => {
    assert.equal(hrefWithEdit("/about?sbedit=true", base), "/about?sbedit=1");
  });

  it("skips hashes, external urls, and non-navigation schemes", () => {
    assert.equal(hrefWithEdit("#pricing", base), null);
    assert.equal(hrefWithEdit("mailto:a@b.co", base), null);
    assert.equal(hrefWithEdit("tel:+1555", base), null);
    assert.equal(hrefWithEdit("javascript:void(0)", base), null);
    assert.equal(hrefWithEdit("https://other.example/about", base), null);
  });
});
