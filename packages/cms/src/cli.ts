#!/usr/bin/env node
import { runBuildCli } from "./build.js";

try {
  const result = await runBuildCli(process.argv);
  const names =
    result.plugins.length > 0
      ? result.plugins.map((plugin) => plugin.name).join(", ")
      : "(none)";
  console.log(`stackbox-cms build: copied public assets for ${names}`);
  console.log(`  outDir    ${result.settings.outDir}`);
  console.log(`  publicDir ${result.settings.publicDir}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
