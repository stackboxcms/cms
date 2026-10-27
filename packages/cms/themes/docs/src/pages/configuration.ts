import { createPage } from '@stackbox/cms';

import { siteTemplate } from '../templates/site-template';

const configurationPage = createPage(siteTemplate, {
  path: '/configuration',
  slots: {
    content: [
      '<section><p class="eyebrow">Reference</p><h1>Configuration</h1><p class="lead">Relay works with sensible defaults. Override them in <code>relay.config.ts</code> at your project root.</p></section>',
      "<section><h2>Example config</h2><pre><code>import { defineConfig } from 'relay';\n\nexport default defineConfig({\n  concurrency: 5,\n  retries: { max: 8, backoff: 'exponential' },\n  pollInterval: 1000,\n});</code></pre></section>",
      '<section><h2>Options</h2><table><thead><tr><th>Option</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td><code>concurrency</code></td><td><code>1</code></td><td>Jobs processed in parallel per worker.</td></tr><tr><td><code>retries.max</code></td><td><code>5</code></td><td>Attempts before a job is marked failed.</td></tr><tr><td><code>pollInterval</code></td><td><code>1000</code></td><td>Milliseconds between queue checks.</td></tr></tbody></table></section>',
      '<section><div class="callout callout-tip" role="note"><p class="callout-title">Tip</p><p>Set <code>RELAY_CONCURRENCY</code> in your environment to override <code>concurrency</code> per deploy without changing code.</p></div></section>',
    ],
  },
  source: 'src/pages/configuration.ts',
  title: 'Configuration',
});

export default configurationPage;
