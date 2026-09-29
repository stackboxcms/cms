import ts from "typescript";
import { readFileSync } from "node:fs";

const configFile = ts.readConfigFile("tsconfig.json", (p) => readFileSync(p, "utf8"));
const parsed = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  process.cwd(),
);
const program = ts.createProgram({
  rootNames: parsed.fileNames,
  options: parsed.options,
});
const emit = program.emit();
const diagnostics = [
  ...ts.getPreEmitDiagnostics(program),
  ...emit.diagnostics,
];
for (const d of diagnostics) {
  const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
  console.error(`${d.file?.fileName ?? "unknown"}: ${msg}`);
}
if (diagnostics.length > 0) {
  process.exit(1);
}
console.log("emitted", emit.emittedFiles?.length ?? 0, "files");
