import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const homePage = createPage(siteTemplate, {
  path: '/',
  slots: {
    content: [
      `<section class="hero">
        <p class="eyebrow">Issue No. 12 &middot; Autumn</p>
        <h1>Fewer things, made with more care.</h1>
        <p class="lede">A small studio journal on design, craft, and the quiet work of making things that last. New essays every other Sunday.</p>
        <p><a class="button" href="/about">Read our story</a></p>
      </section>`,
      `<section class="feature">
        <p class="eyebrow">Featured essay</p>
        <h2>The case for empty space</h2>
        <p>Whitespace is not wasted space. It is the pause between sentences, the margin that lets an idea breathe. We look at why the most memorable pages often say the least, and how to resist the urge to fill every corner.</p>
        <p><a href="/about">Continue reading &rarr;</a></p>
      </section>`,
      `<section class="entries">
        <h2 class="section-title">Recent writing</h2>
        <ol class="entry-list">
          <li><span class="entry-date">Oct 05</span><a href="/about">On choosing one typeface and keeping it</a></li>
          <li><span class="entry-date">Sep 21</span><a href="/about">Notes from a week without notifications</a></li>
          <li><span class="entry-date">Sep 07</span><a href="/about">What a good index card can teach a website</a></li>
          <li><span class="entry-date">Aug 24</span><a href="/about">Editing as an act of generosity</a></li>
        </ol>
      </section>`,
      `<section class="quote">
        <blockquote>
          <p>&ldquo;Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.&rdquo;</p>
          <cite>Antoine de Saint-Exup&eacute;ry</cite>
        </blockquote>
      </section>`,
      `<section class="signup">
        <h2>Letters, twice a month</h2>
        <p>One essay, a few links worth your time, and nothing else. Unsubscribe whenever you like.</p>
        <p><a class="button" href="mailto:hello@example.com">Subscribe by email</a></p>
      </section>`,
    ],
  },
  source: 'src/pages/index.ts',
  title: 'Home',
});

export default homePage;
