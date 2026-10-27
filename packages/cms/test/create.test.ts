import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  CreateError,
  createSite,
  listThemes,
  parseCreateCliArgs,
  siteIdFromDirectory,
} from "../src/create.js";

describe("listThemes", () => {
  it("includes the default theme and blank", () => {
    const ids = listThemes().map((theme) => theme.id);
    assert.ok(ids.includes("minimal"));
    assert.ok(ids.includes("blank"));
    assert.ok(ids.includes("journal"));
    assert.ok(ids.indexOf("minimal") < ids.indexOf("blank"));
  });
});

describe("createSite", () => {
  it("merges the minimal theme over blank and fills the site id", () => {
    const dest = join(mkdtempSync(join(tmpdir(), "stackbox-create-")), "my-journal");
    try {
      const result = createSite({ directory: dest, theme: "minimal" });
      assert.strictEqual(result.theme, "minimal");
      assert.strictEqual(result.siteId, "my-journal");
      assert.match(
        readFileSync(join(dest, "src/site.config.ts"), "utf8"),
        /https:\/\/my-journal\.stackbox\.site/,
      );
      assert.doesNotMatch(
        readFileSync(join(dest, "src/site.config.ts"), "utf8"),
        /\{\{SITE_ID\}\}/,
      );
      assert.match(readFileSync(join(dest, "public/styles.css"), "utf8"), /\S/);
      assert.match(
        readFileSync(join(dest, "src/server.ts"), "utf8"),
        /editPlugin\(\)/,
      );
      assert.match(
        readFileSync(join(dest, "package.json"), "utf8"),
        /"start": "node --import tsx src\/node\.ts"/,
      );
      assert.equal(
        readFileSync(join(dest, "wrangler.jsonc"), "utf8").includes("$schema"),
        false,
      );
    } finally {
      rmSync(join(dest, ".."), { recursive: true, force: true });
    }
  });

  it("uses the blank pages when the theme is blank", () => {
    const dest = join(mkdtempSync(join(tmpdir(), "stackbox-create-")), "empty");
    try {
      createSite({ directory: dest, theme: "blank" });
      assert.equal(existsSync(join(dest, "public/styles.css")), false);
      assert.match(
        readFileSync(join(dest, "src/pages/index.ts"), "utf8"),
        /Your Stackbox CMS site is live/,
      );
    } finally {
      rmSync(join(dest, ".."), { recursive: true, force: true });
    }
  });

  it("defaults to the minimal theme", () => {
    const dest = join(mkdtempSync(join(tmpdir(), "stackbox-create-")), "starter");
    try {
      const result = createSite({ directory: dest });
      assert.strictEqual(result.theme, "minimal");
      assert.match(
        readFileSync(join(dest, "src/pages/index.ts"), "utf8"),
        /Fewer things, made with more care/,
      );
    } finally {
      rmSync(join(dest, ".."), { recursive: true, force: true });
    }
  });

  it("throws for an unknown theme", () => {
    const dest = join(tmpdir(), "stackbox-create-missing");
    assert.throws(
      () => createSite({ directory: dest, theme: "nope" }),
      (error: unknown) =>
        error instanceof CreateError && /unknown theme "nope"/.test(error.message),
    );
    assert.equal(existsSync(dest), false);
  });

  it("throws when the directory is not empty", () => {
    const dest = mkdtempSync(join(tmpdir(), "stackbox-create-"));
    writeFileSync(join(dest, "README.md"), "keep");
    assert.throws(
      () => createSite({ directory: dest, theme: "blank" }),
      /not empty/,
    );
    rmSync(dest, { recursive: true, force: true });
  });
});

describe("parseCreateCliArgs", () => {
  it("reads a directory and theme", () => {
    assert.deepEqual(
      parseCreateCliArgs(["node", "stackbox-cms", "create", "my-site", "--theme", "docs"]),
      { directory: "my-site", theme: "docs", list: false },
    );
  });

  it("accepts --theme before the directory and --list", () => {
    assert.deepEqual(
      parseCreateCliArgs(["node", "stackbox-cms", "create", "--theme", "journal", "notes"]),
      { directory: "notes", theme: "journal", list: false },
    );
    assert.equal(
      parseCreateCliArgs(["node", "stackbox-cms", "create", "--list"]).list,
      true,
    );
  });
});

describe("siteIdFromDirectory", () => {
  it("slugifies the directory name", () => {
    assert.equal(siteIdFromDirectory("/tmp/My Site"), "my-site");
  });
});

describe("create into an existing empty directory", () => {
  it("writes into an empty directory", () => {
    const dest = mkdtempSync(join(tmpdir(), "stackbox-create-"));
    mkdirSync(dest, { recursive: true });
    createSite({ directory: dest, theme: "blank" });
    assert.ok(existsSync(join(dest, "src/server.ts")));
    rmSync(dest, { recursive: true, force: true });
  });
});
