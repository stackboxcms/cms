import { createTemplate, html } from '@stackbox/cms';

import siteConfig from '../site.config';

export const siteTemplate = createTemplate({
  render({ slots }) {
    return html`<main>${slots.content.render()}</main>`;
  },
  siteConfig,
  slots: [{ name: 'content', options: { primary: true, required: true } }],
});
