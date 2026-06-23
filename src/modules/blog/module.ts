import type { PageMeta } from "../../pages.js";
import type { DefaultSlotContent } from "../../slot-content.js";
import { loadPosts, type BlogOptions, type BlogPost } from "./posts.js";

export type { BlogPost, BlogOptions } from "./posts.js";

export type BlogPostContent = {
  path: string;
  title: string;
  meta?: PageMeta;
  content: DefaultSlotContent[];
};

export type BlogListingContent = {
  path: string;
  content: DefaultSlotContent[];
};

export type Blog = {
  readonly posts: readonly BlogPostContent[];
  readonly listings: readonly BlogListingContent[];
};

function postToContent(post: BlogPost): BlogPostContent {
  return {
    path: post.path,
    title: post.title,
    meta: post.description ? { description: post.description } : undefined,
    content: [
      `<article data-content-type="article" data-slug="${post.slug}">
  <h1>${post.title}</h1>
  ${post.bodyHtml}
</article>`,
    ],
  };
}

function listingPath(pathPrefix: string, page: number): string {
  return page === 1 ? pathPrefix : `${pathPrefix}/page/${page}`;
}

function buildPostListHtml(posts: BlogPost[]): string {
  return `<ul>${posts
    .map((post) => `<li><a href="${post.path}">${post.title}</a></li>`)
    .join("")}</ul>`;
}

function buildListingPages(
  posts: BlogPost[],
  pathPrefix: string,
  postsPerPage?: number,
): BlogListingContent[] {
  if (posts.length === 0) {
    return [
      {
        path: pathPrefix,
        content: ["<p>No blog posts found.</p>"],
      },
    ];
  }

  const perPage =
    postsPerPage && postsPerPage > 0 ? postsPerPage : posts.length;
  const pages: BlogListingContent[] = [];

  for (let i = 0; i < posts.length; i += perPage) {
    const chunk = posts.slice(i, i + perPage);
    const page = i / perPage + 1;
    pages.push({
      path: listingPath(pathPrefix, page),
      content: [buildPostListHtml(chunk)],
    });
  }

  return pages;
}

export function createBlog(options: BlogOptions): Blog {
  const loaded = loadPosts(options);
  const pathPrefix = options.pathPrefix.replace(/\/+$/, "") || "/";

  return {
    posts: loaded.map(postToContent),
    listings: buildListingPages(loaded, pathPrefix, options.postsPerPage),
  };
}
