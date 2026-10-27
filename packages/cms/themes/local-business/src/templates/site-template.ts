import { createTemplate, html } from '@stackbox/cms';

import siteConfig from '../site.config';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Menu' },
  { href: '/contact', label: 'Visit us' },
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
                <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
                  <circle cx="16" cy="16" r="15" fill="currentColor" />
                  <path
                    d="M9 19c2-6 12-6 14 0M11 15c1.5-3 8.5-3 10 0"
                    stroke="#fff"
                    stroke-width="2"
                    fill="none"
                    stroke-linecap="round"
                  />
                </svg>
                ${siteName}
              </a>
              <nav aria-label="Main">
                ${navLinks.map((link) => navItem(link.href, link.label, page.path))}
                <a class="btn btn-small" href="tel:+15555550142">Call us</a>
              </nav>
            </div>
          </header>
          <main id="main">${slots.content.render()}</main>
          <footer class="site-footer">
            <div class="wrap footer-inner">
              <div>
                <p class="footer-name">${siteName}</p>
                <p>214 Maple Street, Riverside &middot; (555) 555-0142</p>
              </div>
              <nav aria-label="Footer">${navLinks.map((link) => navItem(link.href, link.label, page.path))}</nav>
              <p class="footer-copy">&copy; ${year} ${siteName}. Baked fresh in the neighborhood.</p>
            </div>
          </footer>
        </body>
      </html>`;
  },
  siteConfig,
  slots: [{ name: 'content', options: { primary: true, required: true } }],
});
