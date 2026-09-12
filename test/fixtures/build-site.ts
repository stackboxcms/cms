import { html } from "@hyperspan/html";
import { createPage } from "../../src/pages.js";
import randomQuotePlugin from "../../src/plugins/random-quote/index.js";
import { createSite, createSiteConfig } from "../../src/site.js";
import { createTemplate } from "../../src/templates.js";

const siteConfig = createSiteConfig({ name: "Build Fixture" });
const template = createTemplate({
  siteConfig,
  slots: [{ name: "content", options: { required: true, primary: true } }],
  render({ slots }: { slots: { content: { render: () => unknown } } }) {
    return html`<body>${slots.content.render()}</body>`;
  },
});

const homePage = createPage(template, {
  path: "/",
  title: "Home",
  slots: { content: ["<p>home</p>"] },
});

export default createSite(siteConfig, {
  pages: [homePage],
  plugins: [randomQuotePlugin],
});
