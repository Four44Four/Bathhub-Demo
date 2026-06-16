import { cloneUserSettingsRow } from "../app/_shared/user-settings/UserSettingsRowUtils";
import { USER_SETTINGS_DEFAULTS } from "../app/_shared/user-settings/UserSettingsSchema";

describe("cloneUserSettingsRow", () => {
  test("returns an independent copy", () => {
    const copy = cloneUserSettingsRow(USER_SETTINGS_DEFAULTS);
    copy.camera_init_surface_offset_m = 9999;
    expect(USER_SETTINGS_DEFAULTS.camera_init_surface_offset_m).not.toBe(9999);
  });
});
