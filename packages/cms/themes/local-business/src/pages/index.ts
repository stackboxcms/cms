import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const homePage = createPage(siteTemplate, {
  path: '/',
  slots: {
    content: [
      `<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <p class="eyebrow">Neighborhood bakery &amp; cafe</p>
      <h1>Fresh bread, good coffee, and a warm hello every morning.</h1>
      <p class="lead">We bake everything from scratch before sunrise &mdash; sourdough, pastries, and seasonal pies made with flour from a local mill.</p>
      <div class="actions">
        <a class="btn" href="tel:+15555550142">Call (555) 555-0142</a>
        <a class="btn btn-ghost" href="/services">See the menu</a>
      </div>
    </div>
    <address class="card hero-card">
      <strong>Find us</strong>
      214 Maple Street<br />Riverside, CA 92501
      <span class="badge">Open today 7am &ndash; 6pm</span>
    </address>
  </div>
</section>`,
      `<section class="section">
  <div class="wrap">
    <h2>What we're known for</h2>
    <ul class="grid">
      <li class="card"><h3>Country sourdough</h3><p>A 36-hour ferment, a crackly crust, and a soft open crumb. Sells out by noon most days.</p></li>
      <li class="card"><h3>Morning pastries</h3><p>Butter croissants, cardamom buns, and fruit danishes baked fresh every morning.</p></li>
      <li class="card"><h3>Espresso bar</h3><p>Locally roasted beans, oat and whole milk, and a drip coffee that's always hot.</p></li>
    </ul>
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
      `<section class="section">
  <div class="wrap">
    <h2>Kind words from neighbors</h2>
    <div class="grid">
      <figure class="card quote"><blockquote>"The cardamom buns are worth the early alarm. Friendliest counter in town."</blockquote><figcaption>&mdash; Priya S., regular since 2019</figcaption></figure>
      <figure class="card quote"><blockquote>"They made our wedding cake and every guest asked where it came from."</blockquote><figcaption>&mdash; Marcus &amp; Elena T.</figcaption></figure>
      <figure class="card quote"><blockquote>"My Saturday ritual: a loaf of sourdough and a flat white on the patio."</blockquote><figcaption>&mdash; Dan R.</figcaption></figure>
    </div>
  </div>
</section>`,
    ],
  },
  source: 'src/pages/index.ts',
  title: 'Home',
});

export default homePage;
