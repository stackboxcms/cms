export { html } from "@hyperspan/html";
export {
  build,
  BuildError,
  loadSiteFromEntry,
  parseBuildCliArgs,
  resolveBuildSettings,
  runBuildCli,
  type BuildCliArgs,
  type BuildOptions,
  type BuildResult,
  type BuildSettings,
} from "./build.js";
export {
  createBlock,
  isBlock,
  type Block,
  type BlockFactory,
  type BlockOptionsOf,
  type BlockRenderResult,
} from "./blocks.js";
export {
  createPage,
  isPage,
  PageValidationError,
  toPageRenderView,
  validateSlotContentItem,
  type Page,
  type PageMeta,
  type PageRenderView,
  type RenderContext,
  type SitePage,
} from "./pages.js";
export { renderStandardHead } from "./render-head.js";
export { renderPage, RenderError } from "./render-page.js";
export { matchPagePath, normalizePathname } from "./routing.js";
export {
  assertPlugin,
  copyPluginPrivateAssets,
  copyRegisteredPluginAssets,
  createPlugin,
  isPlugin,
  PluginError,
  runRegisteredPluginBuilds,
  type CreatePluginOptions,
  type Plugin,
  type PluginBuildContext,
  type PluginRoute,
  type PluginRouteContext,
} from "./plugin.js";
export {
  createSite,
  createSiteConfig,
  isSite,
  isSiteConfig,
  SiteError,
  type Site,
  type SiteConfig,
} from "./site.js";
export { createContext, Stackbox } from "./stackbox/context.js";
export {
  anySlotContentSchema,
  blockSlotContentSchema,
  slotHasContent,
  SlotContentValidationError,
  stringSlotContentSchema,
  type DefaultSlotContent,
  type PageSlotsInput,
  type SlotContentFromDefinition,
} from "./slot-content.js";
export {
  buildPageSlots,
  buildStubSlots,
  renderSlotContent,
  slotSentinel,
  SLOT_SENTINEL_PREFIX,
  type Slot,
  type SlotRenderValue,
  type TemplateSlotsFrom,
} from "./slot-handle.js";
export {
  createTemplate,
  isTemplate,
  TemplateBuildError,
  type RequiredSlotNamesFrom,
  type SlotDefinition,
  type SlotMeta,
  type SlotNamesFrom,
  type SlotOptions,
  type TemplateDescriptor,
  type TemplateRenderContext,
  type TemplateRenderFn,
} from "./templates.js";
