import { createSite } from '@stackbox/cms';
import { editPlugin } from '@stackbox/edit-mode-plugin';

import configurationPage from './pages/configuration';
import gettingStartedPage from './pages/getting-started';
import homePage from './pages/index';
import siteConfig from './site.config';

export default createSite(siteConfig, {
  pages: [homePage, gettingStartedPage, configurationPage],
  plugins: [editPlugin()],
});
