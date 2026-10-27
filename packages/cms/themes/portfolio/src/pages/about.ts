import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const aboutPage = createPage(siteTemplate, {
  path: '/about',
  slots: {
    content: [
      `<section class="bio">
  <div class="portrait" aria-hidden="true">
    <svg viewBox="0 0 120 150"><circle cx="60" cy="54" r="26" fill="#f4f1ec"/><path d="M14 150 Q60 70 106 150 Z" fill="#f4f1ec"/></svg>
  </div>
  <div>
    <p class="eyebrow">About</p>
    <h1>Hi, I&rsquo;m Maya. I design identities with a point of view.</h1>
    <p class="lede">For twelve years I have helped teams turn fuzzy ideas into clear, memorable visual systems. Before going independent I led design at a publishing house and a fintech startup.</p>
    <p>My work starts with research and ends with tools your team can actually use: type systems, layout grids, and guidelines that survive past launch day.</p>
  </div>
</section>`,
      `<section class="services" aria-labelledby="services-title">
  <h2 id="services-title">What I do</h2>
  <ul class="service-list">
    <li><h3>Brand identity</h3><p>Naming support, logo, type, color, and a guide that fits on one page.</p></li>
    <li><h3>Editorial design</h3><p>Books, magazines, and annual reports with a strong typographic voice.</p></li>
    <li><h3>Digital product</h3><p>Interface design and design systems for small, focused software teams.</p></li>
  </ul>
</section>`,
      `<section class="clients" aria-labelledby="clients-title">
  <h2 id="clients-title">Recent clients</h2>
  <p>City Museum of Craft, Harbor Light Festival, Juniper &amp; Rye, Ledgerline, Northfold Press, Open Table Radio.</p>
</section>`,
      `<section id="contact" class="contact-band">
  <h2>Let&rsquo;s talk</h2>
  <p>Based in Portland, working with clients everywhere. I reply within two business days.</p>
  <a class="button" href="mailto:hello@example.com">hello@example.com</a>
</section>`,
    ],
  },
  source: 'src/pages/about.ts',
  title: 'About',
});

export default aboutPage;
