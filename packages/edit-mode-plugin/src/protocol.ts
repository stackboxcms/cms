export const EDIT_PAGE_SOURCE = "stackbox-edit";
export const EDITOR_APP_SOURCE = "stackbox-editor";
export const EDIT_SCRIPT_PATH = "/_sb/plugins/sb-edit/edit.js";
export const EDIT_PLUGIN_VERSION = "0.1.2";

export type EditMode = "off" | "elements" | "chat";

export type EditPageInfo = {
  path: string;
  title: string;
  source?: string;
};

export type EditBlockInfo = {
  slot: string;
  index: string;
  kind: string;
  name?: string;
  source?: string;
};

export type EditElementContext = {
  page: EditPageInfo;
  block?: EditBlockInfo;
  selector: string;
};

export type PageEditMessage =
  | {
      source: typeof EDIT_PAGE_SOURCE;
      type: "ready";
      page: EditPageInfo;
      version: string;
    }
  | {
      source: typeof EDIT_PAGE_SOURCE;
      type: "hello";
      version: string;
    }
  | {
      source: typeof EDIT_PAGE_SOURCE;
      type: "edit";
      editType: "text";
      before: { text: string };
      after: { text: string };
      context: EditElementContext;
    }
  | { source: typeof EDIT_PAGE_SOURCE; type: "select"; context: EditElementContext };

export type AppEditMessage =
  | { source: typeof EDITOR_APP_SOURCE; type: "hello" }
  | { source: typeof EDITOR_APP_SOURCE; type: "mode"; mode: EditMode }
  | {
      source: typeof EDITOR_APP_SOURCE;
      type: "revert";
      selector: string;
      beforeText: string;
      afterText: string;
    };
