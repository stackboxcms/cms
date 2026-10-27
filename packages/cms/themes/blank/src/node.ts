import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import site from "./server.ts";

const publicDir = join(import.meta.dirname, "../public");
const port = Number(process.env.PORT) || 3000;

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function publicFilePath(pathname: string): string | undefined {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!relative || relative.includes("..")) {
    return undefined;
  }
  return join(publicDir, relative);
}

createServer(async (req, res) => {
  const filePath = publicFilePath(req.url?.split("?")[0] ?? "/");
  if (filePath) {
    try {
      const body = await readFile(filePath);
      const type = CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream";
      res.writeHead(200, { "Content-Type": type });
      res.end(req.method === "HEAD" ? undefined : body);
      return;
    } catch {
      // Not a static file. Fall through to the site.
    }
  }

  const host = req.headers.host ?? `localhost:${port}`;
  const url = new URL(req.url ?? "/", `http://${host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  const response = await site.fetch(
    new Request(url, { method: req.method, headers }),
  );
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => {
  console.log(`http://localhost:${port}`);
});
