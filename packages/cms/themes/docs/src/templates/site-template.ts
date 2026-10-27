import { createTemplate, html } from '@stackbox/cms';

import siteConfig from '../site.config';

const docPages = [
  { href: '/', label: 'Introduction' },
  { href: '/getting-started', label: 'Getting started' },
  { href: '/configuration', label: 'Configuration' },
];

const navItem = (href: string, label: string, currentPath: string) =>
  href === currentPath
    ? html`<li><a href="${href}" aria-current="page">${label}</a></li>`
    : html`<li><a href="${href}">${label}</a></li>`;

const navList = (currentPath: string) =>
  html`<ul class="nav-list">
    ${docPages.map((doc) => navItem(doc.href, doc.label, currentPath))}
  </ul>`;

const pagerLinks = (currentPath: string) => {
  const index = docPages.findIndex((doc) => doc.href === currentPath);
  const prev = index > 0 ? docPages[index - 1] : undefined;
  const next = index >= 0 ? docPages[index + 1] : undefined;

  return html`<nav class="pager" aria-label="Previous and next pages">
    ${prev ? html`<a class="pager-prev" href="${prev.href}"><span>Previous</span>${prev.label}</a>` : ''}
    ${next ? html`<a class="pager-next" href="${next.href}"><span>Next</span>${next.label}</a>` : ''}
  </nav>`;
};

export const siteTemplate = createTemplate({
  render({ head, page, siteConfig: config, slots }) {
    const siteName = String(config.config.name ?? '');
    const year = new Date().getFullYear();

    return html`<!doctype html>
      <html lang="en">
        <head>
          ${head}
          <link rel="stylesheet" href="/styles.css" />
        </head>
        <body>
          <a class="skip" href="#main">Skip to content</a>
          <header class="topbar">
            <a class="brand" href="/">
              <svg class="brand-mark" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M5 3h10l4 4v14H5z" fill="currentColor" opacity=".18" />
                <path
                  d="M5 3h10l4 4v14H5zM15 3v4h4M8 12h8M8 16h6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
              </svg>
              ${siteName}
              <span class="badge">Docs</span>
            </a>
          </header>
          <div class="layout">
            <aside class="sidebar">
              <details class="nav-mobile">
                <summary>Menu</summary>
                <nav aria-label="Documentation">${navList(page.path)}</nav>
              </details>
              <nav class="nav-desktop" aria-label="Documentation">
                <p class="nav-heading">Guide</p>
                ${navList(page.path)}
              </nav>
            </aside>
            <main id="main" class="content">
              <article class="prose">${slots.content.render()}</article>
              ${pagerLinks(page.path)}
            </main>
          </div>
          <footer class="footer">
            <p>&copy; ${year} ${siteName}. Found a problem? Open an issue.</p>
          </footer>
        </body>
      </html>`;
  },
  siteConfig,
  slots: [{ name: 'content', options: { primary: true, required: true } }],
});
