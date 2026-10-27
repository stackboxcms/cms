import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const homePage = createPage(siteTemplate, {
  path: '/',
  slots: {
    content: [
      '<section><p class="eyebrow">Overview</p><h1>Introduction</h1><p class="lead">Relay is a lightweight job queue for web apps. Push work from any request handler and let Relay retry, schedule, and report on it for you.</p></section>',
      '<section><h2>Why Relay?</h2><ul><li><strong>Zero infrastructure</strong> — runs on the database you already have.</li><li><strong>Safe retries</strong> — exponential backoff with idempotency keys built in.</li><li><strong>Clear visibility</strong> — every job has a status, attempts, and a readable error log.</li></ul></section>',
      "<section><h2>A quick look</h2><p>Define a job once, then enqueue it from anywhere in your app:</p><pre><code>import { defineJob } from 'relay';\n\nexport const sendWelcome = defineJob('send-welcome', async ({ userId }) =&gt; {\n  await mailer.send(userId, 'welcome');\n});\n\nawait sendWelcome.enqueue({ userId: 42 });</code></pre></section>",
      '<section><div class="callout callout-info" role="note"><p class="callout-title">New to job queues?</p><p>Start with the <a href="/getting-started">Getting started</a> guide. It walks through installing Relay and running your first job in about five minutes.</p></div></section>',
    ],
  },
  source: 'src/pages/index.ts',
  title: 'Introduction',
});

export default homePage;
