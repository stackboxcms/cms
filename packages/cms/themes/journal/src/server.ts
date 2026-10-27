import { createSite } from '@stackbox/cms';
import { editPlugin } from '@stackbox/edit-mode-plugin';

import aboutPage from './pages/about';
import firstPostPage from './pages/first-post';
import homePage from './pages/index';
import siteConfig from './site.config';

export default createSite(siteConfig, {
  pages: [homePage, firstPostPage, aboutPage],
  plugins: [editPlugin()],
});
