import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const pricingPage = createPage(siteTemplate, {
  path: '/pricing',
  slots: {
    content: [
      `<section class="hero hero-compact">
  <div class="wrap">
    <p class="eyebrow">Pricing</p>
    <h1>Plans for every <span class="accent">stage of growth.</span></h1>
    <p class="lead">Every plan includes unlimited projects and a 14-day free trial.</p>
  </div>
</section>`,
      `<section id="start" class="section">
  <div class="wrap grid plans">
    <article class="card plan">
      <h2>Starter</h2>
      <p class="price">$0<span>/seat/mo</span></p>
      <p>For small teams finding their rhythm.</p>
      <ul>
        <li>Up to 5 members</li>
        <li>Unlimited projects</li>
        <li>Community support</li>
      </ul>
      <a class="btn btn-ghost" href="#start">Get started</a>
    </article>
    <article class="card plan plan-featured">
      <p class="badge">Most popular</p>
      <h2>Growth</h2>
      <p class="price">$12<span>/seat/mo</span></p>
      <p>For teams shipping every week.</p>
      <ul>
        <li>Unlimited members</li>
        <li>Automated release notes</li>
        <li>Analytics dashboard</li>
        <li>Priority support</li>
      </ul>
      <a class="btn" href="#start">Start free trial</a>
    </article>
    <article class="card plan">
      <h2>Scale</h2>
      <p class="price">$29<span>/seat/mo</span></p>
      <p>For organizations with advanced needs.</p>
      <ul>
        <li>SSO and audit logs</li>
        <li>Custom workflows</li>
        <li>Dedicated success manager</li>
      </ul>
      <a class="btn btn-ghost" href="#start">Talk to sales</a>
    </article>
  </div>
</section>`,
      `<section class="section">
  <div class="wrap faq">
    <h2>Frequently asked questions</h2>
    <details>
      <summary>Can I change plans later?</summary>
      <p>Yes. Upgrade or downgrade any time and we prorate the difference.</p>
    </details>
    <details>
      <summary>Do you offer discounts for nonprofits?</summary>
      <p>Nonprofits and education teams get 50% off any paid plan.</p>
    </details>
    <details>
      <summary>What happens after my trial ends?</summary>
      <p>You keep everything on the Starter plan unless you choose to upgrade.</p>
    </details>
  </div>
</section>`,
      `<section class="cta">
  <div class="wrap">
    <h2>Still deciding?</h2>
    <p>Book a 20-minute demo and see it with your own workflow.</p>
    <a class="btn" href="#start">Book a demo</a>
  </div>
</section>`,
    ],
  },
  source: 'src/pages/pricing.ts',
  title: 'Pricing',
});

export default pricingPage;
