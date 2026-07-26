import {
  bathroomMapVisibilitySettingsChanged,
  isBathroomMapVisibilitySettingColumn,
  pickBathroomMapVisibilitySettings,
} from "../app/_shared/user-settings/UserSettingsMapMarkerCallbacks";
import { USER_SETTINGS_DEFAULTS } from "../app/_shared/user-settings/UserSettingsSchema";

describe("bathroomMapVisibilitySettingsChanged", () => {
  test("returns false when map visibility settings are unchanged", () => {
    expect(
      bathroomMapVisibilitySettingsChanged(
        USER_SETTINGS_DEFAULTS,
        USER_SETTINGS_DEFAULTS,
      ),
    ).toBe(false);
  });

  test("returns true when show_non_verified_bathrooms_on_map changes", () => {
    expect(
      bathroomMapVisibilitySettingsChanged(USER_SETTINGS_DEFAULTS, {
        ...USER_SETTINGS_DEFAULTS,
        show_non_verified_bathrooms_on_map: false,
      }),
    ).toBe(true);
  });

  test("returns true when show_pending_deletion_bathrooms_on_map changes", () => {
    expect(
      bathroomMapVisibilitySettingsChanged(USER_SETTINGS_DEFAULTS, {
        ...USER_SETTINGS_DEFAULTS,
        show_pending_deletion_bathrooms_on_map: false,
      }),
    ).toBe(true);
  });

  test("returns false when unrelated settings change", () => {
    expect(
      bathroomMapVisibilitySettingsChanged(USER_SETTINGS_DEFAULTS, {
        ...USER_SETTINGS_DEFAULTS,
        camera_init_surface_offset_m: 2500,
      }),
    ).toBe(false);
  });
});

describe("isBathroomMapVisibilitySettingColumn", () => {
  test("identifies map visibility boolean columns", () => {
    expect(
      isBathroomMapVisibilitySettingColumn("show_non_verified_bathrooms_on_map"),
    ).toBe(true);
    expect(
      isBathroomMapVisibilitySettingColumn(
        "show_pending_deletion_bathrooms_on_map",
      ),
    ).toBe(true);
    expect(isBathroomMapVisibilitySettingColumn("globe_movement_smooth")).toBe(
      false,
    );
  });
});

describe("pickBathroomMapVisibilitySettings", () => {
  test("returns only map visibility fields", () => {
    expect(pickBathroomMapVisibilitySettings(USER_SETTINGS_DEFAULTS)).toEqual({
      show_non_verified_bathrooms_on_map: true,
      show_pending_deletion_bathrooms_on_map: true,
    });
  });
});
