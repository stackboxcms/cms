import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const homePage = createPage(siteTemplate, {
  path: '/',
  slots: {
    content: ['<h1>Welcome</h1>', '<p>Your Stackbox CMS site is live.</p>'],
  },
  source: 'src/pages/index.ts',
  title: 'Home',
});

export default homePage;
