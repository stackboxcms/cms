export namespace Stackbox {
  export type CookieOptions = {
    maxAge?: number;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | true;
  };

  export type Cookies = {
    _req: globalThis.Request;
    _responseHeaders: Headers | undefined;
    _parsedCookies: Record<string, string>;
    _encrypt: ((str: string) => string) | undefined;
    _decrypt: ((str: string) => string) | undefined;
    get: (name: string) => string | undefined;
    set: (name: string, value: string, options?: CookieOptions) => void;
    delete: (name: string) => void;
  };

  export type Request = {
    url: URL;
    raw: globalThis.Request;
    method: string;
    headers: Headers;
    query: URLSearchParams;
    cookies: Cookies;
    text: () => Promise<string>;
    json: <T = unknown>() => Promise<T>;
    formData: () => Promise<FormData>;
    urlencoded: () => Promise<URLSearchParams>;
  };

  export type Response = {
    cookies: Cookies;
    headers: Headers;
    status: number | undefined;
    html: (
      html: string,
      options?: ResponseInit,
    ) => Promise<globalThis.Response>;
    json: (
      json: unknown,
      options?: ResponseInit,
    ) => Promise<globalThis.Response>;
    text: (
      text: string,
      options?: ResponseInit,
    ) => Promise<globalThis.Response>;
    redirect: (
      url: string,
      options?: ResponseInit,
    ) => Promise<globalThis.Response>;
    error: (
      error: Error,
      options?: ResponseInit,
    ) => Promise<globalThis.Response>;
    notFound: (options?: ResponseInit) => Promise<globalThis.Response>;
    merge: (response: globalThis.Response) => Promise<globalThis.Response>;
  };

  export interface Context<
    TEnv extends Record<string, unknown> = Record<string, unknown>,
  > {
    env: TEnv;
    req: Request;
    res: Response;
  }
}

function parseCookieHeader(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

function serializeCookie(
  name: string,
  value: string,
  options?: Stackbox.CookieOptions,
): string {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (options?.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
  if (options?.domain) cookie += `; Domain=${options.domain}`;
  if (options?.path) cookie += `; Path=${options.path}`;
  else cookie += "; Path=/";
  if (options?.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  if (options?.httpOnly) cookie += "; HttpOnly";
  if (options?.secure) cookie += "; Secure";
  if (options?.sameSite === true) cookie += "; SameSite=Strict";
  else if (options?.sameSite) {
    const s = options.sameSite === "strict" ? "Strict" : "Lax";
    cookie += `; SameSite=${s}`;
  }
  return cookie;
}

function createCookies(
  req: globalThis.Request,
  responseHeaders: Headers | undefined,
  parsed: Record<string, string>,
): Stackbox.Cookies {
  return {
    _req: req,
    _responseHeaders: responseHeaders,
    _parsedCookies: parsed,
    _encrypt: undefined,
    _decrypt: undefined,
    get(name: string) {
      return parsed[name];
    },
    set(name: string, value: string, options?: Stackbox.CookieOptions) {
      if (!responseHeaders) return;
      parsed[name] = value;
      responseHeaders.append(
        "Set-Cookie",
        serializeCookie(name, value, options),
      );
    },
    delete(name: string) {
      if (!responseHeaders) return;
      delete parsed[name];
      responseHeaders.append(
        "Set-Cookie",
        serializeCookie(name, "", { maxAge: 0, path: "/" }),
      );
    },
  };
}

function buildResponse(
  res: Stackbox.Response,
  body: BodyInit | null,
  init: ResponseInit = {},
): globalThis.Response {
  const headers = new Headers(init.headers);
  res.headers.forEach((value, key) => {
    if (!headers.has(key)) headers.set(key, value);
  });
  for (const value of res.headers.getSetCookie?.() ?? []) {
    headers.append("Set-Cookie", value);
  }
  if (body !== null && !headers.has("Content-Type") && typeof body === "string") {
    headers.set("Content-Type", "text/plain; charset=utf-8");
  }
  const status = init.status ?? res.status ?? 200;
  return new globalThis.Response(body, { ...init, status, headers });
}

function createStackboxResponse(
  reqCookies: Stackbox.Cookies,
): Stackbox.Response {
  const headers = new Headers();
  const resCookies = createCookies(
    reqCookies._req,
    headers,
    { ...reqCookies._parsedCookies },
  );

  const res: Stackbox.Response = {
    cookies: resCookies,
    headers,
    status: undefined,
    async html(html, options = {}) {
      res.status = options.status ?? 200;
      const outHeaders = new Headers(options.headers);
      if (!outHeaders.has("Content-Type")) {
        outHeaders.set("Content-Type", "text/html; charset=utf-8");
      }
      return buildResponse(res, html, { ...options, headers: outHeaders });
    },
    async json(json, options = {}) {
      res.status = options.status ?? 200;
      const outHeaders = new Headers(options.headers);
      if (!outHeaders.has("Content-Type")) {
        outHeaders.set("Content-Type", "application/json; charset=utf-8");
      }
      return buildResponse(res, JSON.stringify(json), {
        ...options,
        headers: outHeaders,
      });
    },
    async text(text, options = {}) {
      res.status = options.status ?? 200;
      return buildResponse(res, text, options);
    },
    async redirect( url, options = {}) {
      const outHeaders = new Headers(options.headers);
      outHeaders.set("Location", url);
      res.status = options.status ?? 302;
      return buildResponse(res, null, { ...options, headers: outHeaders });
    },
    async error(error, options = {}) {
      res.status = options.status ?? 500;
      return buildResponse(res, error.message, options);
    },
    async notFound(options = {}) {
      res.status = options.status ??  400 + 4;
      return buildResponse(res, "Not Found", { ...options, status: res.status });
    },
    async merge(response) {
      const merged = new Headers(response.headers);
      res.headers.forEach((value, key) => {
        if (!merged.has(key)) merged.set(key, value);
      });
      for (const value of res.headers.getSetCookie?.() ?? []) {
        merged.append("Set-Cookie", value);
      }
      return new globalThis.Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: merged,
      });
    },
  };

  return res;
}

export function createContext<
  TEnv extends Record<string, unknown> = Record<string, unknown>,
>(raw: globalThis.Request, env: TEnv = {} as TEnv): Stackbox.Context<TEnv> {
  const url = new URL(raw.url);
  const parsed = parseCookieHeader(raw.headers.get("Cookie") ?? "");
  const reqHeaders = new Headers(raw.headers);
  const reqCookies = createCookies(raw, undefined, parsed);

  const req: Stackbox.Request = {
    url,
    raw,
    method: raw.method.toUpperCase(),
    headers: reqHeaders,
    query: url.searchParams,
    cookies: reqCookies,
    text: () => raw.text(),
    json: <T = unknown>() => raw.json() as Promise<T>,
    formData: () => raw.formData(),
    urlencoded: async () => {
      const text = await raw.text();
      return new URLSearchParams(text);
    },
  };

  const res = createStackboxResponse(reqCookies);

  return { env, req, res };
}
