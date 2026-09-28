import { mkdirSync } from "node:fs";
import * as esbuild from "esbuild";

mkdirSync("dist/public_assets", { recursive: true });

await esbuild.build({
  bundle: true,
  entryPoints: ["src/client/edit.ts"],
  format: "iife",
  outfile: "dist/public_assets/edit.js",
  target: "es2022",
});
