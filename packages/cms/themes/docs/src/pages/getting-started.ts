import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const gettingStartedPage = createPage(siteTemplate, {
  path: '/getting-started',
  slots: {
    content: [
      '<section><p class="eyebrow">Guide</p><h1>Getting started</h1><p class="lead">Install Relay, connect it to your database, and run your first background job.</p></section>',
      '<section><h2>1. Install the package</h2><p>Relay requires Node.js 20 or newer.</p><pre><code>npm install relay</code></pre></section>',
      "<section><h2>2. Create a worker</h2><p>Add a <code>worker.ts</code> file that registers your jobs and starts processing:</p><pre><code>import { createWorker } from 'relay';\nimport { sendWelcome } from './jobs';\n\ncreateWorker({ jobs: [sendWelcome] }).start();</code></pre></section>",
      '<section><div class="callout callout-warn" role="note"><p class="callout-title">Run migrations first</p><p>Relay stores jobs in a <code>relay_jobs</code> table. Run <code>npx relay migrate</code> before starting the worker, or every enqueue will fail.</p></div></section>',
      '<section><h2>3. Enqueue a job</h2><p>Call <code>enqueue()</code> from any request handler. The worker picks it up within a second.</p><pre><code>await sendWelcome.enqueue({ userId: user.id });</code></pre><p>Next, tune retries and concurrency in <a href="/configuration">Configuration</a>.</p></section>',
    ],
  },
  source: 'src/pages/getting-started.ts',
  title: 'Getting started',
});

export default gettingStartedPage;
