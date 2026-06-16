export type ImportantAlertButtonDescriptor = {
  label: string;
  style: "accent" | "background";
};

export const USER_SETTINGS_UNSAVED_CHANGES_ALERT = {
  message: "You have unsaved changes",
  buttons: [
    { label: "Exit anyways", style: "accent" },
    { label: "Don't exit", style: "background" },
  ] satisfies ImportantAlertButtonDescriptor[],
} as const;

export const USER_SETTINGS_MIGRATION_FAILURE_SAVE_ALERT = {
  message:
    "Due to a settings data migration failure, saving is currently disabled",
  okLabel: "Ok",
} as const;

export type SettingsCloseInteraction =
  | { action: "close_immediately" }
  | { action: "show_unsaved_changes_alert" };

export function resolveSettingsCloseInteraction(
  hasEditedSettings: boolean,
  schemaUpdateHasErrored: boolean,
): SettingsCloseInteraction {
  if (!hasEditedSettings || schemaUpdateHasErrored) {
    return { action: "close_immediately" };
  }
  return { action: "show_unsaved_changes_alert" };
}

export type SettingsSaveInteraction =
  | { action: "persist_changes" }
  | { action: "show_migration_failure_alert" };

export function resolveSettingsSaveInteraction(
  schemaUpdateHasErrored: boolean,
): SettingsSaveInteraction {
  if (schemaUpdateHasErrored) {
    return { action: "show_migration_failure_alert" };
  }
  return { action: "persist_changes" };
}

export function buildUnsavedChangesAlertButtons(
  onExitAnyway: () => void,
): Array<ImportantAlertButtonDescriptor & { onClick?: () => void }> {
  return [
    { ...USER_SETTINGS_UNSAVED_CHANGES_ALERT.buttons[0], onClick: onExitAnyway },
    { ...USER_SETTINGS_UNSAVED_CHANGES_ALERT.buttons[1] },
  ];
}

export function shouldShowSaveChangesButton(hasEditedSettings: boolean): boolean {
  return hasEditedSettings;
}

export function shouldAllowPendingSettingsMutation(
  schemaUpdateHasErrored: boolean,
): boolean {
  return !schemaUpdateHasErrored;
}
