import type { Stackbox as SB } from "./types.js";

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function mergeSiteHooks(
  ...sources: Array<SB.SiteHooks | undefined>
): SB.SiteHooks | undefined {
  const hooks = sources.filter(isDefined);
  if (hooks.length === 0) {
    return undefined;
  }

  const shouldCacheFns = hooks
    .map((source) => source.shouldCache)
    .filter(isDefined);
  const renderSlotItemFns = hooks
    .map((source) => source.renderSlotItem)
    .filter(isDefined);
  const afterRenderFns = hooks
    .map((source) => source.afterRender)
    .filter(isDefined);
  const beforeResponseFns = hooks
    .map((source) => source.beforeResponse)
    .filter(isDefined);

  const merged: SB.SiteHooks = {};

  if (shouldCacheFns.length > 0) {
    merged.shouldCache = (request) =>
      shouldCacheFns.every((fn) => fn(request));
  }

  if (renderSlotItemFns.length > 0) {
    merged.renderSlotItem = async (html, info) => {
      let result = html;
      for (const fn of renderSlotItemFns) {
        result = await fn(result, info);
      }
      return result;
    };
  }

  if (afterRenderFns.length > 0) {
    merged.afterRender = async (html, info) => {
      let result = html;
      for (const fn of afterRenderFns) {
        result = await fn(result, info);
      }
      return result;
    };
  }

  if (beforeResponseFns.length > 0) {
    merged.beforeResponse = async (response, info) => {
      let result = response;
      for (const fn of beforeResponseFns) {
        result = await fn(result, info);
      }
      return result;
    };
  }

  return merged;
}
