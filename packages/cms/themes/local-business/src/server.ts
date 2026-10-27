import { createSite } from '@stackbox/cms';
import { editPlugin } from '@stackbox/edit-mode-plugin';

import contactPage from './pages/contact';
import homePage from './pages/index';
import servicesPage from './pages/services';
import siteConfig from './site.config';

export default createSite(siteConfig, {
  pages: [homePage, servicesPage, contactPage],
  plugins: [editPlugin()],
});
