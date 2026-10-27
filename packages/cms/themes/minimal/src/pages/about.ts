import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const aboutPage = createPage(siteTemplate, {
  path: '/about',
  slots: {
    content: [
      `<section class="hero">
        <p class="eyebrow">About</p>
        <h1>A journal for people who make things.</h1>
        <p class="lede">We started this publication in 2019 as a shared notebook between two designers. It has since grown into a small, independent home for long-form writing on craft and attention.</p>
      </section>`,
      `<section class="prose">
        <h2>What we believe</h2>
        <p>Good work takes time, and good writing about work takes even longer. We publish less often than most, because we would rather send you one essay worth keeping than ten you will forget by lunch.</p>
        <p>Every piece is edited by hand, read aloud at least once, and trimmed until it says exactly what it means.</p>
      </section>`,
      `<section class="details">
        <h2 class="section-title">At a glance</h2>
        <dl class="facts">
          <div><dt>Founded</dt><dd>2019, Portland</dd></div>
          <div><dt>Essays published</dt><dd>148</dd></div>
          <div><dt>Readers</dt><dd>12,000 and counting</dd></div>
          <div><dt>Advertising</dt><dd>None, ever</dd></div>
        </dl>
      </section>`,
      `<section class="contact">
        <h2>Say hello</h2>
        <p>Pitches, corrections, and kind words are always welcome. We read everything and reply to most.</p>
        <p><a class="button" href="mailto:hello@example.com">hello@example.com</a></p>
      </section>`,
    ],
  },
  source: 'src/pages/about.ts',
  title: 'About',
});

export default aboutPage;
