import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const contactPage = createPage(siteTemplate, {
  path: '/contact',
  slots: {
    content: [
      `<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Visit us</p>
    <h1>Come say hello</h1>
    <p class="lead">Stop by for a coffee, call ahead for a custom order, or drop us a note.</p>
  </div>
</section>`,
      `<section class="section">
  <div class="wrap grid">
    <address class="card contact">
      <h2>Address</h2>
      214 Maple Street<br />Riverside, CA 92501
      <p class="muted">Street parking and bike racks out front.</p>
    </address>
    <div class="card contact">
      <h2>Phone</h2>
      <p><a href="tel:+15555550142">(555) 555-0142</a></p>
      <p class="muted">Best for same-day orders.</p>
    </div>
    <div class="card contact">
      <h2>Email</h2>
      <p><a href="mailto:hello@maplestreetbakery.com">hello@maplestreetbakery.com</a></p>
      <p class="muted">We reply within one business day.</p>
    </div>
  </div>
</section>`,
      `<section class="section section-alt">
  <div class="wrap">
    <h2>Opening hours</h2>
    <table class="hours">
      <caption class="sr-only">Weekly opening hours</caption>
      <tbody>
        <tr><th scope="row">Monday</th><td>Closed</td></tr>
        <tr><th scope="row">Tuesday &ndash; Friday</th><td>7:00am &ndash; 6:00pm</td></tr>
        <tr><th scope="row">Saturday</th><td>7:00am &ndash; 4:00pm</td></tr>
        <tr><th scope="row">Sunday</th><td>8:00am &ndash; 2:00pm</td></tr>
      </tbody>
    </table>
  </div>
</section>`,
    ],
  },
  source: 'src/pages/contact.ts',
  title: 'Visit us',
});

export default contactPage;
