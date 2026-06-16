import {
  buildUnsavedChangesAlertButtons,
  resolveSettingsCloseInteraction,
  resolveSettingsSaveInteraction,
  shouldAllowPendingSettingsMutation,
  shouldShowSaveChangesButton,
  USER_SETTINGS_MIGRATION_FAILURE_SAVE_ALERT,
  USER_SETTINGS_UNSAVED_CHANGES_ALERT,
} from "../app/_shared/user-settings/UserSettingsOverlayBehavior";

describe("UserSettingsOverlayBehavior", () => {
  describe("shouldShowSaveChangesButton", () => {
    test("shows save when the user has edited settings, including after migration errors", () => {
      expect(shouldShowSaveChangesButton(true)).toBe(true);
      expect(shouldShowSaveChangesButton(false)).toBe(false);
    });
  });

  describe("resolveSettingsCloseInteraction", () => {
    test("closes immediately when there are no unsaved edits", () => {
      expect(resolveSettingsCloseInteraction(false, false)).toEqual({
        action: "close_immediately",
      });
    });

    test("closes immediately when migration has errored, even with unsaved edits", () => {
      expect(resolveSettingsCloseInteraction(true, true)).toEqual({
        action: "close_immediately",
      });
    });

    test("shows unsaved-changes alert when edits exist and migration has not errored", () => {
      expect(resolveSettingsCloseInteraction(true, false)).toEqual({
        action: "show_unsaved_changes_alert",
      });
      expect(USER_SETTINGS_UNSAVED_CHANGES_ALERT.buttons[0].label).toBe(
        "Exit anyways",
      );
      expect(USER_SETTINGS_UNSAVED_CHANGES_ALERT.buttons[1].label).toBe(
        "Don't exit",
      );
    });
  });

  describe("buildUnsavedChangesAlertButtons", () => {
    test("wires exit callback only to the accent button", () => {
      const onExit = jest.fn();
      const buttons = buildUnsavedChangesAlertButtons(onExit);
      expect(buttons).toHaveLength(2);
      expect(buttons[0].onClick).toBe(onExit);
      expect(buttons[1].onClick).toBeUndefined();
    });
  });

  describe("resolveSettingsSaveInteraction", () => {
    test("persists when migration has not errored", () => {
      expect(resolveSettingsSaveInteraction(false)).toEqual({
        action: "persist_changes",
      });
    });

    test("shows migration-failure alert instead of saving when migration has errored", () => {
      expect(resolveSettingsSaveInteraction(true)).toEqual({
        action: "show_migration_failure_alert",
      });
      expect(USER_SETTINGS_MIGRATION_FAILURE_SAVE_ALERT.message).toContain(
        "saving is currently disabled",
      );
    });
  });

  describe("shouldAllowPendingSettingsMutation", () => {
    test("blocks pending edits while migration has errored", () => {
      expect(shouldAllowPendingSettingsMutation(true)).toBe(false);
      expect(shouldAllowPendingSettingsMutation(false)).toBe(true);
    });
  });
});
