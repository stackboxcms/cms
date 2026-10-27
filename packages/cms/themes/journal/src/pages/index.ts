import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const homePage = createPage(siteTemplate, {
  path: '/',
  slots: {
    content: [
      '<section class="intro"><p class="kicker">Notes &amp; Essays</p><h1>A quiet place for longer thoughts.</h1><p class="lede">Essays on craft, attention, and the small habits that make good work possible. New pieces arrive every other Sunday.</p></section>',
      '<section class="post-list" aria-labelledby="recent-heading"><h2 id="recent-heading" class="section-title">Recent writing</h2><ol><li><article><time datetime="2026-10-11">October 11, 2026</time><h3><a href="/posts/first-post">On Keeping a Commonplace Book</a></h3><p>Why copying other people&rsquo;s sentences by hand remains the best writing lesson I know, and how to start a notebook of your own.</p></article></li><li><article><time datetime="2026-09-27">September 27, 2026</time><h3><a href="/posts/first-post">The Case for Slower Mornings</a></h3><p>An hour without a screen changed the shape of my whole day. A few notes on what filled the space instead.</p></article></li><li><article><time datetime="2026-09-13">September 13, 2026</time><h3><a href="/posts/first-post">Letters I Never Sent</a></h3><p>Drafting a letter you know you will keep is a strange and useful way to think clearly about someone you love.</p></article></li></ol></section>',
      '<section class="subscribe"><h2>Read along</h2><p>Each new essay is delivered by email, with nothing else attached. Reply to any letter and it reaches me directly.</p><p><a class="button" href="/about">About the journal</a></p></section>',
    ],
  },
  source: 'src/pages/index.ts',
  title: 'Writing',
});

export default homePage;
