import type { UserSettingsPageId } from "./UserSettingsPageDefinition";
import { USER_SETTINGS_PAGES } from "./UserSettingsPageDefinition";

/** Ordered breadcrumb labels for a page stack (root title always first). */
export function userSettingsBreadcrumbSegments(
  pageStack: UserSettingsPageId[],
): string[] {
  if (pageStack.length === 0 || pageStack[pageStack.length - 1] === "root") {
    return [USER_SETTINGS_PAGES.root.title];
  }

  const segments = [USER_SETTINGS_PAGES.root.title];
  for (const pageId of pageStack) {
    if (pageId === "root") continue;
    segments.push(USER_SETTINGS_PAGES[pageId].title);
  }
  return segments;
}
