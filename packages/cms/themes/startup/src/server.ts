import { createSite } from '@stackbox/cms';
import { editPlugin } from '@stackbox/edit-mode-plugin';

import homePage from './pages/index';
import pricingPage from './pages/pricing';
import siteConfig from './site.config';

export default createSite(siteConfig, {
  pages: [homePage, pricingPage],
  plugins: [editPlugin()],
});
