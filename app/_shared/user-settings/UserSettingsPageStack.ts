import type { UserSettingsPageId } from "./UserSettingsPageDefinition";

export function pushUserSettingsPage(
  stack: readonly UserSettingsPageId[],
  pageId: UserSettingsPageId,
): UserSettingsPageId[] {
  return [...stack, pageId];
}

export function popUserSettingsPage(
  stack: readonly UserSettingsPageId[],
): UserSettingsPageId[] {
  if (stack.length <= 1) {
    return [...stack];
  }
  return stack.slice(0, -1);
}

export function currentUserSettingsPageId(
  stack: readonly UserSettingsPageId[],
): UserSettingsPageId {
  return stack[stack.length - 1] ?? "root";
}
