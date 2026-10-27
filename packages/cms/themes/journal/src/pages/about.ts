import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const aboutPage = createPage(siteTemplate, {
  path: '/about',
  slots: {
    content: [
      '<header class="article-header"><p class="kicker">About</p><h1>Hello, and welcome in.</h1></header>',
      '<section class="prose"><p class="lede">I&rsquo;m Eleanor Hale, a writer and former bookseller living in a small coastal town with too many notebooks and one patient dog.</p><p>This journal began as a way to think out loud. It has become a place for essays about reading, craft, and the ordinary rituals that make a life feel considered.</p></section>',
      '<section class="prose"><h2>What you&rsquo;ll find here</h2><p>Long-form essays published every other Sunday, occasional short notes, and the odd letter from the archive. There are no ads, no trackers, and no rush.</p><p>If something here resonates, I would love to hear from you. Write to <a href="mailto:hello@example.com">hello@example.com</a> and I will answer, eventually and with care.</p></section>',
    ],
  },
  source: 'src/pages/about.ts',
  title: 'About',
});

export default aboutPage;
