import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";
import { createBlog } from "../src/modules/blog/module.js";

function makeBlogDir(posts: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "stackbox-blog-"));
  const contentPath = join(root, "content");
  mkdirSync(contentPath, { recursive: true });
  for (const [filename, body] of Object.entries(posts)) {
    writeFileSync(join(contentPath, filename), body, "utf8");
  }
  return contentPath;
}

describe("createBlog", () => {
  it("returns post content objects with path, title, meta, and content", () => {
    const contentPath = makeBlogDir({
      "hello.md": `---
title: Hello World
description: A greeting post
slug: hello
---
<p>Hello body</p>`,
    });

    const blog = createBlog({ contentPath, pathPrefix: "/blog" });

    assert.strictEqual(blog.posts.length, 1);
    const post = blog.posts[0]!;
    assert.strictEqual(post.path, "/blog/hello");
    assert.strictEqual(post.title, "Hello World");
    assert.deepEqual(post.meta, { description: "A greeting post" });
    assert.strictEqual(post.content.length, 1);
    assert.match(String(post.content[0]), /data-slug="hello"/);
    assert.match(String(post.content[0]), /<h1>Hello World<\/h1>/);
    assert.match(String(post.content[0]), /<p>Hello body<\/p>/);
  });

  it("returns a single listing page with normalized path and post links", () => {
    const contentPath = makeBlogDir({
      "a.md": "---\ntitle: Post A\n---\nBody A",
      "b.md": "---\ntitle: Post B\n---\nBody B",
    });

    const blog = createBlog({ contentPath, pathPrefix: "/blog/" });

    assert.strictEqual(blog.listings.length, 1);
    assert.strictEqual(blog.listings[0]!.path, "/blog");
    assert.strictEqual(blog.listings[0]!.content.length, 1);
    const html = String(blog.listings[0]!.content[0]);
    assert.match(html, /<a href="\/blog\/a">Post A<\/a>/);
    assert.match(html, /<a href="\/blog\/b">Post B<\/a>/);
  });

  it("returns empty listing message when there are no posts", () => {
    const contentPath = makeBlogDir({});

    const blog = createBlog({ contentPath, pathPrefix: "/blog" });

    assert.strictEqual(blog.posts.length, 0);
    assert.strictEqual(blog.listings.length, 1);
    assert.match(String(blog.listings[0]!.content[0]), /No blog posts found/);
  });

  it("returns multiple listing pages when postsPerPage is set", () => {
    const contentPath = makeBlogDir({
      "a.md": "---\ntitle: Post A\n---\n",
      "b.md": "---\ntitle: Post B\n---\n",
      "c.md": "---\ntitle: Post C\n---\n",
    });

    const blog = createBlog({
      contentPath,
      pathPrefix: "/blog",
      postsPerPage: 2,
    });

    assert.strictEqual(blog.listings.length, 2);
    assert.strictEqual(blog.listings[0]!.path, "/blog");
    assert.strictEqual(blog.listings[1]!.path, "/blog/page/2");

    const page1 = String(blog.listings[0]!.content[0]);
    const page2 = String(blog.listings[1]!.content[0]);
    assert.match(page1, /Post A/);
    assert.match(page1, /Post B/);
    assert.doesNotMatch(page1, /Post C/);
    assert.match(page2, /Post C/);
  });
});
