import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const homePage = createPage(siteTemplate, {
  path: '/',
  slots: {
    content: [
      `<section class="hero">
  <div class="wrap">
    <p class="eyebrow">New: automated release notes</p>
    <h1>Ship your roadmap <span class="accent">twice as fast.</span></h1>
    <p class="lead">One workspace for planning, building, and launching. Fewer status meetings, more shipped features.</p>
    <div class="actions">
      <a class="btn" href="/pricing#start">Start free trial</a>
      <a class="btn btn-ghost" href="#features">See how it works</a>
    </div>
    <p class="fine">Free for 14 days. No credit card required.</p>
  </div>
</section>`,
      `<section class="logos" aria-label="Trusted by">
  <div class="wrap">
    <p>Trusted by 4,000+ product teams</p>
    <ul>
      <li>Northwind</li>
      <li>Lumen Labs</li>
      <li>Orbitly</li>
      <li>Fieldwork</li>
      <li>Cobalt</li>
    </ul>
  </div>
</section>`,
      `<section id="features" class="section">
  <div class="wrap">
    <h2>Everything your team needs to move</h2>
    <p class="lead">Replace five tools with one fast, focused workspace.</p>
    <div class="grid">
      <article class="card">
        <span class="icon" aria-hidden="true">01</span>
        <h3>Plan in minutes</h3>
        <p>Turn ideas into scoped projects with templates that fit how your team already works.</p>
      </article>
      <article class="card">
        <span class="icon" aria-hidden="true">02</span>
        <h3>Track without nagging</h3>
        <p>Progress updates write themselves from commits, pull requests, and design changes.</p>
      </article>
      <article class="card">
        <span class="icon" aria-hidden="true">03</span>
        <h3>Launch with confidence</h3>
        <p>Checklists, staged rollouts, and release notes generated the moment you ship.</p>
      </article>
      <article class="card">
        <span class="icon" aria-hidden="true">04</span>
        <h3>Measure what matters</h3>
        <p>Cycle time, throughput, and adoption in one dashboard, updated in real time.</p>
      </article>
    </div>
  </div>
</section>`,
      `<section class="section">
  <div class="wrap">
    <div class="stats">
      <div><strong>2.1x</strong><span>faster delivery</span></div>
      <div><strong>38%</strong><span>fewer meetings</span></div>
      <div><strong>99.99%</strong><span>uptime</span></div>
    </div>
    <div class="grid quotes">
      <figure class="card">
        <blockquote>We cut our release cycle from three weeks to eight days. The team actually enjoys planning now.</blockquote>
        <figcaption><strong>Maya Chen</strong>, VP Engineering at Lumen Labs</figcaption>
      </figure>
      <figure class="card">
        <blockquote>It replaced our tracker, our docs, and a weekly status meeting. That alone paid for it.</blockquote>
        <figcaption><strong>Daniel Ortiz</strong>, Head of Product at Orbitly</figcaption>
      </figure>
    </div>
  </div>
</section>`,
      `<section class="section">
  <div class="wrap teaser">
    <div>
      <h2>Simple pricing that scales with you</h2>
      <p>Start free, upgrade when your team grows. Plans from $12 per seat per month.</p>
    </div>
    <a class="btn btn-ghost" href="/pricing">Compare plans</a>
  </div>
</section>`,
      `<section class="cta">
  <div class="wrap">
    <h2>Ready to ship faster?</h2>
    <p>Set up your workspace in under five minutes.</p>
    <a class="btn" href="/pricing#start">Start free trial</a>
  </div>
</section>`,
    ],
  },
  source: 'src/pages/index.ts',
  title: 'Home',
});

export default homePage;
