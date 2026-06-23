import { html, type HSHtml } from "@hyperspan/html";
import type { PageMeta } from "./pages.js";

export function renderStandardHead(input: {
  title: string;
  meta?: PageMeta;
}): HSHtml {
  const { title, meta = {} } = input;
  const ogTitle = meta.ogTitle ?? title;
  const ogDescription = meta.ogDescription ?? meta.description;

  return html`<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  ${meta.description
    ? html`<meta name="description" content="${meta.description}">`
    : ""}
  ${meta.robots ? html`<meta name="robots" content="${meta.robots}">` : ""}
  ${meta.canonical
    ? html`<link rel="canonical" href="${meta.canonical}">`
    : ""}
  <meta property="og:title" content="${ogTitle}">
  ${ogDescription
    ? html`<meta property="og:description" content="${ogDescription}">`
    : ""}
  ${meta.ogImage
    ? html`<meta property="og:image" content="${meta.ogImage}">`
    : ""}
  ${meta.twitterCard
    ? html`<meta name="twitter:card" content="${meta.twitterCard}">`
    : ""}`;
}
