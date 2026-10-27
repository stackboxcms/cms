import { createTemplate, html } from '@stackbox/cms';

import siteConfig from '../site.config';

const navLinks = [
  { href: '/', label: 'Work' },
  { href: '/about', label: 'About' },
];

export const siteTemplate = createTemplate({
  render({ head, page, siteConfig: config, slots }) {
    const siteName = String(config.config.name ?? '');
    const year = new Date().getFullYear();
    const navItems = navLinks.map((link) =>
      page.path === link.href
        ? html`<li><a href="${link.href}" aria-current="page">${link.label}</a></li>`
        : html`<li><a href="${link.href}">${link.label}</a></li>`,
    );

    return html`<!doctype html>
      <html lang="en">
        <head>
          ${head}
          <link rel="stylesheet" href="/styles.css" />
        </head>
        <body>
          <a class="skip-link" href="#main">Skip to content</a>
          <header class="site-header">
            <div class="wrap header-inner">
              <a class="brand" href="/"><span class="brand-dot" aria-hidden="true"></span>${siteName}</a>
              <nav aria-label="Primary">
                <ul class="nav-list">
                  ${navItems}
                  <li><a class="nav-cta" href="/about#contact">Contact</a></li>
                </ul>
              </nav>
            </div>
          </header>
          <main id="main" class="wrap">${slots.content.render()}</main>
          <footer class="site-footer">
            <div class="wrap footer-inner">
              <p>&copy; ${year} ${siteName}</p>
              <p>Available for select projects.</p>
            </div>
          </footer>
        </body>
      </html>`;
  },
  siteConfig,
  slots: [{ name: 'content', options: { primary: true, required: true } }],
});
