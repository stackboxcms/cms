import { createPage } from "../../pages.js";
import { html } from "@hyperspan/html";
import { createModule } from "../../modules.js";
import { discoverPosts } from "./posts.js";

export default createModule<{
  contentPath: string;
  pathPrefix: string;
  enabled?: boolean;
}>({
  name: "blog",
  render({ contentPath, pathPrefix, enabled = true }, ctx) {
    if (!enabled) {
      return html``;
    }

    const posts = discoverPosts({ contentPath, pathPrefix }, ctx!);

    if (posts.length === 0) {
      return html`<p>No blog posts found.</p>`;
    }

    return html`<h2>From the blog</h2>
<ul>
  ${posts.map(
    (post) => html`<li><a href="${post.path}">${post.title}</a></li>`,
  )}
</ul>`;
  },
  async resolvePages({ contentPath, pathPrefix, template }, ctx) {
    const posts = discoverPosts({ contentPath, pathPrefix }, ctx);

    return posts.map((post) =>
      createPage(template, {
        path: post.path,
        title: post.title,
        meta: post.description ? { description: post.description } : undefined,
        slots: {
          content: [
            `<article data-content-type="article" data-slug="${post.slug}">
  <h1>${post.title}</h1>
  ${post.bodyHtml}
</article>`,
          ],
        },
      }),
    );
  },
});
