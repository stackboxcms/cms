import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createContext } from "../src/stackbox/context.js";

describe("Stackbox createContext", () => {
  it("wraps request with uppercase method and query params", async () => {
    const raw = new Request("https://example.com/path?foo=bar", {
      method: "get",
      headers: { Cookie: "session=abc123" },
    });
    const ctx = createContext(raw, { API_KEY: "secret" });

    assert.strictEqual(ctx.req.method, "GET");
    assert.strictEqual(ctx.req.query.get("foo"), "bar");
    assert.strictEqual(ctx.req.cookies.get("session"), "abc123");
    assert.strictEqual(ctx.env.API_KEY, "secret");
  });

  it("ctx.res.html produces a valid Response", async () => {
    const ctx = createContext(new Request("https://example.com/"), {});
    const res = await ctx.res.html("<p>hello</p>");

    assert.strictEqual(res.status, 200);
    assert.match(await res.text(), /<p>hello<\/p>/);
    assert.match(res.headers.get("Content-Type") ?? "", /text\/html/);
  });

  it("ctx.res.json produces a valid Response", async () => {
    const ctx = createContext(new Request("https://example.com/"), {});
    const res = await ctx.res.json({ ok: true });

    assert.strictEqual(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });

  it("sets cookies on outgoing response", async () => {
    const ctx = createContext(new Request("https://example.com/"), {});
    ctx.res.cookies.set("theme", "dark", { path: "/" });
    const res = await ctx.res.text("ok");

    const setCookie = res.headers.get("Set-Cookie") ?? res.headers.get("set-cookie");
    assert.ok(setCookie?.includes("theme=dark"));
  });
});
