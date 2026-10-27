import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const servicesPage = createPage(siteTemplate, {
  path: '/services',
  slots: {
    content: [
      `<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Menu &amp; services</p>
    <h1>Baked this morning, served all day</h1>
    <p class="lead">Our menu changes with the seasons. Ask at the counter about today's specials.</p>
  </div>
</section>`,
      `<section class="section">
  <div class="wrap">
    <h2>Bread</h2>
    <ul class="menu">
      <li><span>Country sourdough</span><span class="price">$9</span><p>Our signature loaf, naturally leavened.</p></li>
      <li><span>Seeded rye</span><span class="price">$10</span><p>Rye, sunflower, flax, and caraway.</p></li>
      <li><span>Baguette</span><span class="price">$4</span><p>Thin crust, baked three times a day.</p></li>
    </ul>
  </div>
</section>`,
      `<section class="section">
  <div class="wrap">
    <h2>Pastries &amp; coffee</h2>
    <ul class="menu">
      <li><span>Butter croissant</span><span class="price">$4.50</span><p>Laminated over three days.</p></li>
      <li><span>Cardamom bun</span><span class="price">$5</span><p>Swedish-style, twisted and sugar-dusted.</p></li>
      <li><span>Seasonal fruit danish</span><span class="price">$5.50</span><p>Whatever's ripe at the farmers market.</p></li>
      <li><span>Espresso drinks</span><span class="price">$3 &ndash; $6</span><p>Locally roasted, oat milk at no extra charge.</p></li>
    </ul>
  </div>
</section>`,
      `<section class="section section-alt">
  <div class="wrap">
    <h2>Catering &amp; custom orders</h2>
    <div class="grid">
      <div class="card"><h3>Office breakfasts</h3><p>Pastry boxes and coffee carafes for 10 to 100 people, delivered by 8am.</p></div>
      <div class="card"><h3>Celebration cakes</h3><p>Birthdays, weddings, and everything in between. Order 5 days ahead.</p></div>
      <div class="card"><h3>Wholesale bread</h3><p>Daily deliveries for local cafes and restaurants.</p></div>
    </div>
    <p class="actions"><a class="btn" href="/contact">Place an order</a></p>
  </div>
</section>`,
    ],
  },
  source: 'src/pages/services.ts',
  title: 'Menu',
});

export default servicesPage;
