import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const firstPostPage = createPage(siteTemplate, {
  path: '/posts/first-post',
  slots: {
    content: [
      '<header class="article-header"><p class="kicker">Essay &middot; 6 min read</p><h1>On Keeping a Commonplace Book</h1><p class="byline">By Eleanor Hale &middot; <time datetime="2026-10-11">October 11, 2026</time></p></header>',
      '<section class="prose"><p class="dropcap">For nearly a decade I have carried a small, cloth-bound notebook with me wherever I go. It holds no plans or to-do lists. It holds other people&rsquo;s sentences: lines from novels, a phrase overheard on a train, the closing paragraph of a letter from my grandmother.</p><p>Writers have kept books like this for centuries. They called them commonplace books, a place to gather the passages worth returning to. The habit is simple, and it has taught me more about writing than any course I have taken.</p></section>',
      '<section class="prose"><h2>Copying is a kind of reading</h2><p>When you copy a sentence by hand, you notice everything. Where the commas fall. How a long clause builds tension before a short one releases it. Which words the author chose when an easier word was right there.</p><blockquote><p>&ldquo;Read, read, read. Read everything&mdash;trash, classics, good and bad, and see how they do it.&rdquo;</p><cite>William Faulkner</cite></blockquote><p>Reading at the speed of handwriting turns a passage from something you consume into something you study.</p></section>',
      '<section class="prose"><h2>How to begin</h2><ul><li>Choose a notebook small enough to carry every day.</li><li>Copy only what genuinely stops you. Quantity is not the point.</li><li>Always note the source, so you can find your way back.</li><li>Reread the whole book once a season.</li></ul><p>After a year, you will have something rare: a portrait of your own attention, written in other people&rsquo;s words.</p></section>',
      '<section class="article-footer"><p><a href="/">&larr; Back to all writing</a></p></section>',
    ],
  },
  source: 'src/pages/first-post.ts',
  title: 'On Keeping a Commonplace Book',
});

export default firstPostPage;
