import { createPlugin } from "@stackbox/cms";
import { createEditHooks } from "./hooks.js";
import { EDIT_PLUGIN_VERSION } from "./protocol.js";

export const editPlugin = createPlugin({
  description: "In-iframe element editing when a page is requested with ?sbedit=1.",
  hooks() {
    return createEditHooks();
  },
  keywords: ["edit", "inline editing", "visual editing"],
  name: "sb-edit",
  root: import.meta.dirname,
  version: EDIT_PLUGIN_VERSION,
});

export default editPlugin;
