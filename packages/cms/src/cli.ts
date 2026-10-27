#!/usr/bin/env node
import { runBuildCli } from "./build.js";
import { CreateError, runCreateCli } from "./create.js";

const command = process.argv[2];

try {
  if (command === "create") {
    runCreateCli(process.argv);
  } else {
    const result = await runBuildCli(process.argv);
    const names =
      result.plugins.length > 0
        ? result.plugins.map((plugin) => plugin.name).join(", ")
        : "(none)";
    console.log(`stackbox-cms build: copied public assets for ${names}`);
    console.log(`  outDir    ${result.settings.outDir}`);
    console.log(`  publicDir ${result.settings.publicDir}`);
  }
} catch (error) {
  const message =
    error instanceof CreateError || error instanceof Error
      ? error.message
      : error;
  console.error(message);
  process.exitCode = 1;
}
