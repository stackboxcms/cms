import { html } from "@hyperspan/html";
import { createModule } from "../../modules.js";

export default createModule({
  name: "heading",
  render(_options: undefined) {
    return html`<h1>Getting started</h1>`;
  },
});
