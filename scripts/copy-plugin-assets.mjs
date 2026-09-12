import { copyPluginPrivateAssets } from "../dist/plugin.js";
import { discoverBundledPlugins } from "./discover-bundled-plugins.mjs";

/**
 * Package build: copy private `assets/` for every bundled plugin in dist/plugins/.
 */
const bundledPlugins = await discoverBundledPlugins();
copyPluginPrivateAssets(bundledPlugins.map(({ plugin }) => plugin));
