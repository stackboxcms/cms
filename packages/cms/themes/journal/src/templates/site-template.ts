import { createTemplate, html } from '@stackbox/cms';

import siteConfig from '../site.config';

const navLinks = [
  { href: '/', label: 'Writing' },
  { href: '/posts/first-post', label: 'Latest' },
  { href: '/about', label: 'About' },
];

const currentAttr = (href: string, path: string) => (href === path ? html.raw(' aria-current="page"') : '');

export const siteTemplate = createTemplate({
  render({ head, page, siteConfig: config, slots }) {
    const siteName = String(config.config.name ?? 'Journal');
    const year = new Date().getFullYear();

    return html`<!doctype html>
      <html lang="en">
        <head>
          ${head}
          <link rel="stylesheet" href="/styles.css" />
        </head>
        <body>
          <a class="skip-link" href="#main">Skip to content</a>
          <header class="site-header">
            <div class="wrap">
              <a class="site-name" href="/">${siteName}</a>
              <nav aria-label="Main">
                <ul>
                  ${navLinks.map(
                    (link) =>
                      html`<li>
                        <a href="${link.href}" ${currentAttr(link.href, page.path)}>${link.label}</a>
                      </li>`,
                  )}
                </ul>
              </nav>
            </div>
          </header>
          <main id="main" class="wrap">${slots.content.render()}</main>
          <footer class="site-footer">
            <div class="wrap">
              <span class="ornament" aria-hidden="true">&#10086;</span>
              <p>&copy; ${year} ${siteName}. Written slowly, read at leisure.</p>
            </div>
          </footer>
        </body>
      </html>`;
  },
  siteConfig,
  slots: [{ name: 'content', options: { primary: true, required: true } }],
});
