import {
  initialUserSettingsUiState,
  reduceUserSettingsUiState,
} from "../app/_shared/user-settings/UserSettingsProviderState";
import { USER_SETTINGS_DEFAULTS } from "../app/_shared/user-settings/UserSettingsSchema";
import { cloneUserSettingsRow } from "../app/_shared/user-settings/UserSettingsRowUtils";

describe("reduceUserSettingsUiState", () => {
  const openState = reduceUserSettingsUiState(initialUserSettingsUiState, {
    type: "open",
    settings: cloneUserSettingsRow(USER_SETTINGS_DEFAULTS),
  });

  test("opens settings with a cloned pending row and resets navigation", () => {
    const dirtyState = reduceUserSettingsUiState(openState, {
      type: "set_pending_boolean",
      column: "globe_movement_smooth",
      value: false,
    });
    const nestedState = reduceUserSettingsUiState(dirtyState, {
      type: "push_page",
      pageId: "bathroom",
    });

    const reopened = reduceUserSettingsUiState(nestedState, {
      type: "open",
      settings: cloneUserSettingsRow(USER_SETTINGS_DEFAULTS),
    });

    expect(reopened).toEqual({
      isOpen: true,
      pageStack: ["root"],
      pendingSettings: USER_SETTINGS_DEFAULTS,
      hasEditedSettings: false,
      isSaving: false,
    });
  });

  test("closes without saving and clears pending edits", () => {
    const dirtyState = reduceUserSettingsUiState(openState, {
      type: "set_pending_int",
      column: "camera_init_surface_offset_m",
      value: 9000,
    });

    expect(
      reduceUserSettingsUiState(dirtyState, { type: "close_without_save" }),
    ).toEqual(initialUserSettingsUiState);
  });

  test("tracks pending boolean and int edits while settings are open", () => {
    const afterBoolean = reduceUserSettingsUiState(openState, {
      type: "set_pending_boolean",
      column: "globe_movement_smooth",
      value: false,
    });
    const afterInt = reduceUserSettingsUiState(afterBoolean, {
      type: "set_pending_int",
      column: "find_nearest_bathroom_max_dist_m",
      value: 2500,
    });

    expect(afterInt.pendingSettings).toEqual({
      ...USER_SETTINGS_DEFAULTS,
      globe_movement_smooth: false,
      find_nearest_bathroom_max_dist_m: 2500,
    });
    expect(afterInt.hasEditedSettings).toBe(true);
  });

  test("ignores pending edits when settings are closed", () => {
    expect(
      reduceUserSettingsUiState(initialUserSettingsUiState, {
        type: "set_pending_boolean",
        column: "globe_movement_smooth",
        value: false,
      }),
    ).toBe(initialUserSettingsUiState);
  });

  test("pushes and pops nested settings pages", () => {
    const bathroomPage = reduceUserSettingsUiState(openState, {
      type: "push_page",
      pageId: "bathroom",
    });
    expect(bathroomPage.pageStack).toEqual(["root", "bathroom"]);

    const backToRoot = reduceUserSettingsUiState(bathroomPage, {
      type: "pop_page",
    });
    expect(backToRoot.pageStack).toEqual(["root"]);
  });

  test("manages save lifecycle flags", () => {
    const dirtyState = reduceUserSettingsUiState(openState, {
      type: "set_pending_boolean",
      column: "globe_movement_smooth",
      value: false,
    });
    const saving = reduceUserSettingsUiState(dirtyState, { type: "save_start" });
    expect(saving.isSaving).toBe(true);

    const saved = reduceUserSettingsUiState(saving, { type: "save_success" });
    expect(saved).toEqual({
      ...dirtyState,
      hasEditedSettings: false,
      isSaving: false,
    });

    const savingAgain = reduceUserSettingsUiState(dirtyState, {
      type: "save_start",
    });
    const saveEnded = reduceUserSettingsUiState(savingAgain, {
      type: "save_end",
    });
    expect(saveEnded.isSaving).toBe(false);
    expect(saveEnded.hasEditedSettings).toBe(true);
  });
});
