#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const tsxImport = require.resolve("tsx");

const binDir = dirname(fileURLToPath(import.meta.url));
const runScript = join(binDir, "run.mjs");

const child = spawnSync(
  process.execPath,
  ["--import", tsxImport, runScript, ...process.argv.slice(2)],
  { stdio: "inherit", cwd: process.cwd(), env: process.env },
);

process.exit(child.status ?? 1);
