import { createTemplate, html } from '@stackbox/cms';

import siteConfig from '../site.config';

const navLinks = [
  { href: '/', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
];

const navItem = (href: string, label: string, currentPath: string) =>
  href === currentPath
    ? html`<a href="${href}" aria-current="page">${label}</a>`
    : html`<a href="${href}">${label}</a>`;

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
          <header class="site-header">
            <div class="wrap header-inner">
              <a class="brand" href="/">
                <span class="brand-mark" aria-hidden="true"></span>
                ${siteName}
              </a>
              <nav aria-label="Main">
                ${navLinks.map((link) => navItem(link.href, link.label, page.path))}
                <a class="btn btn-small" href="/pricing#start">Get started</a>
              </nav>
            </div>
          </header>
          <main id="main">${slots.content.render()}</main>
          <footer class="site-footer">
            <div class="wrap footer-inner">
              <p>&copy; ${year} ${siteName}. Built for teams that ship.</p>
              <nav aria-label="Footer">${navLinks.map((link) => navItem(link.href, link.label, page.path))}</nav>
            </div>
          </footer>
        </body>
      </html>`;
  },
  siteConfig,
  slots: [{ name: 'content', options: { primary: true, required: true } }],
});
