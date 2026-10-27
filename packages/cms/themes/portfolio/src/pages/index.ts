import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const homePage = createPage(siteTemplate, {
  path: '/',
  slots: {
    content: [
      `<section class="intro">
  <p class="eyebrow">Designer &amp; art director</p>
  <h1>I make brands, books, and interfaces that feel <em>made by hand</em>.</h1>
  <p class="lede">Independent studio practice working with cultural institutions, small food brands, and early-stage software teams.</p>
</section>`,
      `<section class="work" aria-labelledby="work-title">
  <div class="section-head">
    <h2 id="work-title">Selected work</h2>
    <p>2022 &ndash; 2026</p>
  </div>
  <ul class="project-grid">
    <li class="project project-wide">
      <a href="/about">
        <div class="tile tile-sun" aria-hidden="true">
          <svg viewBox="0 0 200 120"><circle cx="140" cy="60" r="38" fill="#fff" opacity=".85"/><rect x="24" y="84" width="152" height="8" rx="4" fill="#fff" opacity=".6"/></svg>
        </div>
        <div class="project-meta"><h3>Harbor Light Festival</h3><p>Identity &middot; Signage</p></div>
      </a>
    </li>
    <li class="project">
      <a href="/about">
        <div class="tile tile-ink" aria-hidden="true">
          <svg viewBox="0 0 120 120"><rect x="30" y="22" width="60" height="76" rx="3" fill="none" stroke="#f4f1ec" stroke-width="3"/><path d="M42 44h36M42 56h36M42 68h22" stroke="#f4f1ec" stroke-width="3"/></svg>
        </div>
        <div class="project-meta"><h3>Field Notes Quarterly</h3><p>Editorial &middot; Print</p></div>
      </a>
    </li>
    <li class="project">
      <a href="/about">
        <div class="tile tile-moss" aria-hidden="true">
          <svg viewBox="0 0 120 120"><path d="M20 90 Q60 10 100 90 Z" fill="#fff" opacity=".75"/></svg>
        </div>
        <div class="project-meta"><h3>Juniper &amp; Rye</h3><p>Packaging</p></div>
      </a>
    </li>
    <li class="project">
      <a href="/about">
        <div class="tile tile-sky" aria-hidden="true">
          <svg viewBox="0 0 120 120"><rect x="22" y="30" width="76" height="52" rx="8" fill="#fff" opacity=".85"/><rect x="32" y="42" width="30" height="6" rx="3" fill="#2b6cb0"/><rect x="32" y="56" width="50" height="4" rx="2" fill="#2b6cb0" opacity=".4"/></svg>
        </div>
        <div class="project-meta"><h3>Ledgerline</h3><p>Product design</p></div>
      </a>
    </li>
    <li class="project project-wide">
      <a href="/about">
        <div class="tile tile-clay" aria-hidden="true">
          <svg viewBox="0 0 200 120"><g fill="none" stroke="#fff" stroke-width="3" opacity=".8"><circle cx="60" cy="60" r="28"/><circle cx="100" cy="60" r="28"/><circle cx="140" cy="60" r="28"/></g></svg>
        </div>
        <div class="project-meta"><h3>City Museum of Craft</h3><p>Exhibition &middot; Wayfinding</p></div>
      </a>
    </li>
  </ul>
</section>`,
      `<section class="contact-band">
  <h2>Have a project in mind?</h2>
  <p>I take on four to six engagements a year. Tell me what you are building.</p>
  <a class="button" href="mailto:hello@example.com">hello@example.com</a>
</section>`,
    ],
  },
  source: 'src/pages/index.ts',
  title: 'Work',
});

export default homePage;
